import base64


### ENVIRONMENT HANDLING
from dotenv import load_dotenv
load_dotenv()
import os

### APP IMPORTS
from flask import Flask, jsonify, render_template
import json
import sqlite3
def connect_db():
    conn = sqlite3.connect('app.db',timeout=5)
    return conn

### EXA API
from exa_py import Exa
exa_api = os.getenv("EXA_API_KEY")
exa = Exa(api_key = exa_api)
from openai import OpenAI
client = OpenAI(
    base_url = "https://api.exa.ai",
    api_key = exa_api,
)

### DAYTONA API 
from daytona import Daytona, DaytonaConfig, SessionExecuteRequest
config = DaytonaConfig(api_key=os.getenv("DAYTONA_API_KEY"))
daytona = Daytona(config)

### REPLICATE API 
import replicate
REPLICATE_API_TOKEN = os.getenv("REPLICATE_API_TOKEN")

### LANGGRAPH IMPORT
from langgraph.graph import StateGraph, START, END
from typing import TypedDict

### AGENT-HEAD CLASS
class TextAgent():
    def __init__(self, model_name, system_prompt):
        self.model_name = model_name
        self.system_prompt = system_prompt
    def gen(self, prompt):
        input = {
            "prompt": prompt,
            "system_prompt": self.system_prompt
        }
        x = ''
        for event in replicate.stream(
            self.model_name,
            input=input
        ):
            x+=str(event)
        return x

### AGENT-HEADS

'''BASE AGENT'''

Router = TextAgent(
    "openai/o4-mini",
    """
    @ ROLE
    You are responsible with providing informative and interesting replies to user queries
    on the topic of ARGO (Oceanic Floater Data Collection). 
    Given the user prompt, you are to determine if the query demands:
    - General Information 
    - Well researched & up to date information regarding the project.
    - Analytics and inferences drawn from the collected data.

    @ INSTRUCTIONS
    If General Information is demanded, you are to:
    - Reply to user based on your own knowledge.
    - If own knowledge is lacking / out of date, search in VectorDB for potential answers using most probable question.
    - If VectorDB does not provide appropriate data, search the Web for answers while providing most relevant search query.

    If Well researched & up to date information is needed:
    - Reply with own knowledge if completely sufficient.
    - Call the Research Model for information while providing the demand of user accurately.

    If Analytics/Inference from collected data is required:
    - Call the Analyzer Model while providing the demand of user accurately.

    @ OUTPUT FORMAT
    Your output has to be necessarily in json format.
    Format -

    {
        "type": action-type,
        "output": action-output
    }

    Available action types:-
    1. reply: answer the user.
    2. web: search web.
    3. research: call the research model.
    4. analyse: call the analyzer model.

    @ EXAMPLES
    prompt: Tell me about ARGO.
    output:
    {
        "type": "reply",
        "output": "~ YOUR-REPLY ~"
    }

    prompt: What is the average salinity around indian ocean?
    output:
    {
        "type": "analyse",
        "output": "~ accurate user demand ~"
    }

    prompt: When was the most recent ARGO event?
    output:
    {
        "type": "web",
        "output": "~ relevant web search query ~"
    }

    @ GENERAL INSTRUCTIONS
    1. Be short, concise and polite in your conversation.
    2. Encourage user to continue conversation by following up with interesting ideas.
    3. Do not entertain unrelated queries, decline politely.
    4. Follow all instructions strictly.
    5. After using analyze mode, if img argument is returned true, at the end of your natural response add the tag 'ANIMGT'.
    6. At the end of your natural response, add a tag 'END' unless using 'ANIMGT'.
    
    @ INPUTS
    You are provided with the user prompt, last few messages (if any),
    as well as a log of assistants/tools you have called, along with your instructions and their outputs (if any).
    Do not call the same tool consecutively.

    """
)

''' WEB SEARCH AGENT '''

Inferencer = TextAgent(
    "openai/o4-mini", 
    """
    @ INSTRUCTION
    Given a large chunk of text and a particular question,
    understand the relevance of the information provided in the text
    and reply with a smaller chunk of text containing relevant information with respect to the question 
    as well as related data for additional context.
    Exclude text that serves no help in improving quality of answer.

    @ INPUT
    user_question
    knowledge_text
    """
)

'''ANALYZE MODE'''

DBM = TextAgent(
    "openai/gpt-5",
    """
    You are a SQL Coder. You are provided with an user query regarding the data,
    with the DB tables and their schema in mind, you are to write the most relevant SQL command
    to retrieve useful data.
    Make sure to write a single SQL command. Two cannot be executed.

    @ SQL SCHEMA 

    CREATE TABLE Data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_name TEXT,
    pi_name TEXT,
    platform_number INTEGER,
    cycle_num INTEGER,
    data_centre TEXT,
    data_mode TEXT,
    float_no INTEGER,
    firmware INTEGER,
    platform_type TEXT,
    juld DATETIME,
    latitude FLOAT,
    longitude FLOAT,
    position_system TEXT);


    CREATE TABLE Observation (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    data_id INTEGER,
    station_param TEXT,
    pressure FLOAT,
    temp FLOAT,
    psal FLOAT);
    """
)

Viz = TextAgent(
    "anthropic/claude-4-sonnet",
    """
    You are provided with a data schema (column names) as well as a human prompt.
    The data is produced by another agent in respect to the human prompt, making it the most relevant information available.
    You duty is to understand the user's demand, the data provided and hence decide on the best possible visualization tactic
    to represent the data. 
    With that understanding, you are required to complete the provided python script to create a matplotlib plot for the same.
    If you consider that no visualization is required for the particular case, answer only with the word 'INVAL'.

    Remember that the completed version of the code you return is to be executed, make it accurate and follow the provded format.
    
    import requests
    import matplotlib.pyplot as plt

    
    #response = requests.get("http://127.0.0.1:5000/data")
    #data = response["data"]
    #cols = response["cols"]
    data = [('2019', 34.48)]
    cols = ['year', 'mean_sss']

    ### YOUR CODE HERE


    plt.savefig("my_plot.png")
        
    
    complete the above code and return (if necessary, otherwise return ONLY 'INVAL').

    DO NOT RETURN ANYTHING EXCEPT EXACTLY THE CODE.
    NO NEED TO ADD ```python ``` at the start and end.
    """
)

DFM = TextAgent(
    "anthropic/claude-4-sonnet",
    """
    You are provided with a data schema (column names) as well as a human prompt.
    The data is produced by another agent in respect to the human prompt, making it the most relevant information available.
    Your duty is to understand the provided data & user requirements,
    and complete the code provided to you.
    You are free to use use pandas/numpy for your analysis.
    Remember that the completed version of the code you return is to be executed, make it accurate and follow the provded format.

    import requests
    import pandas as pd
    import numpy as np

    #response = requests.get("http://127.0.0.1:5000/data")
    #data = response["data"]
    #cols = response["cols"]
    data = [('2019', 34.48)]
    cols = ['year', 'mean_sss']

    ### YOUR CODE HERE. RETURN ALL ANALYSIS IN A SINGLE PRINT.

    DO NOT RETURN ANYTHING EXCEPT EXACTLY THE CODE.
    NO NEED TO ADD ```python ``` at the start and end.
    """
)

### BASE AGENT

class CB(TypedDict):
    messages: list[str]
    output: str
    tool_logs: list[str, str]
    response: str

def start(state: CB):
    prompt = f"""
    ### CONVERSATION
    {state['messages']}

    ### TOOL LOGS
    {state['tool_logs']}
    """
    print("PROMPT: ",prompt)
    return {
        "output": Router.gen(prompt)
    }

def router(state: CB) -> str:
    print("ROUTER INVOKED")
    output = state["output"]
    print(output)
    output = json.loads(output)
    print("JSON PARSING: ",output)
    return output["type"]

def web_search(state: CB):
    print("WEB SEARCH INVOKED")
    query = json.loads(state["output"])["output"]
    result = exa.search_and_contents(
        query,
        text = True,
        type = "auto",
    )
    prompt = f"""
    @ USER QUERY
    {query}

    @ INFORMATION
    {result}
    """
    info = Inferencer.gen(prompt)
    print(info)
    logs = state["tool_logs"]
    logs.append({
        "action": "web",
        "query": query,
        "info": info
    }
    )
    return {
        "tool_logs": logs
    }

def research(state: CB):
    print("RESEARCH INVOKED")
    query = json.loads(state["output"])["output"]
    research = exa.research.create(
        instructions = query,
        model = "exa-research",
    )
    x=''
    for event in exa.research.get(research.research_id, stream = True):
        x+=str(event)
    logs = state["tool_logs"]
    logs.append({
        "action": "research",
        "query": query,
        "info": x
    })
    return {
        "tool_logs": logs
    }

def reply(state: CB):
    print("REPLY INVOKED")
    return {
        "response": json.loads(state["output"])["output"]
    }

def analyse(state: CB):
    print("ANALYZE INVOKED")
    cmd = DBM.gen(json.loads(state["output"])["output"])
    conn = connect_db()
    curr = conn.cursor()
    print(cmd)
    curr.execute(
        cmd
    )
    result = curr.fetchall()
    conn.close()
    print(result)
    columns = [desc[0] for desc in curr.description]
    print(columns)
    global data
    global cols 
    data = result
    cols = columns
    
    print(data, cols)
    input = {
        "prompt": json.loads(state["output"])["output"],
        "schema": columns
    }
    plot = Viz.gen(str(input))
    print("PYCODE AHEAD ###################")
    print(plot)
    sandbox = daytona.create()
    if str(plot) != 'INVAL':
        response = sandbox.process.code_run(plot)
        print("RESPONSE: ", response)
        files = sandbox.fs.download_file("/home/daytona/my_plot.png")
        var = base64.b64encode(files).decode("ascii")
        global b64 
        b64 = var
        

    alz = DFM.gen(str(input))
    print(alz)
    response = sandbox.process.code_run(alz)
    print("RESPONSE: ", response.result)

    sandbox.delete()

    logs = state["tool_logs"]
    logs.append({
        "action": "analyze",
        "query": input["prompt"],
        "info": response.result,
        "img": True if plot != 'INVAL' else False
    })

    return {
        "tool_logs": logs
    }

agent_graph = StateGraph(CB)
agent_graph.add_node("start", start)
agent_graph.add_node("reply", reply)
agent_graph.add_node("web", web_search)
agent_graph.add_node("research", research)
agent_graph.add_node("analyse", analyse)


agent_graph.add_edge(START, "start")
agent_graph.add_conditional_edges(
    "start",
    router,
    {
        "reply": "reply",
        "analyse": "analyse",
        "vector": "reply",
        "web": "web",
        "research": "research"
    }
)
agent_graph.add_edge("reply", END)
agent_graph.add_edge("web", "start")
agent_graph.add_edge("research", "start")
agent_graph.add_edge("analyse", "start")
agent = agent_graph.compile()

global b64
### APP ARCH

app = Flask(__name__, static_folder="dist", template_folder="dist")   


@app.route("/")
def index():
    return render_template("index.html")
    
@app.route("/respond", methods=["GET", "POST"])
def respond():
    msg = None
    if request.method == "POST":
        data = request.get_json()
        if data and "msg" in data:
            msg = data["msg"]
    
  #  return jsonify({"response": response["response"], "msg": msg})
    i = 0
    lk = len(k)
    while i<lk:
        yield f"data: {k[i]}\n\n"
        time.sleep(0.02)
        i+=1
    yield f"data: [DONE]\n\n"
    return Response(event_stream(), mimetype="text/event-stream")


@app.route("/data", methods=["GET","POST"])
def data():
    global data 
    global cols 
    return jsonify({
        "data": data,
        "cols": cols
    })

@app.route("/img", methods=["GET", "POST"])
def img():
    global b64
    return jsonify({"image": b64})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))  
    app.run(host='0.0.0.0', port=port, debug=True)


