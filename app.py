import pandas as pd
import time
from flask import Flask, render_template, request, jsonify, Response, stream_with_context
from flask_cors import CORS
import os
from dotenv import load_dotenv
import json
import requests
from flask import Flask, send_from_directory

# load env once
load_dotenv()

app = Flask(__name__, static_folder="dist", template_folder="dist")      
CORS(app)

@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve(path):
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, "index.html")

latest_history = {}
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"

# --------------------- GEMINI SSE PAIR ---------------------

@app.route("/api/stream", methods=["POST"])
def store_history():
    global latest_history
    latest_history = request.get_json()
    return {"status": "ok"}

@app.route("/api/stream", methods=["GET"])
def gemini_stream():  # renamed to avoid colliding with /stream below
    global latest_history
    if not latest_history:
        return Response("data: ERROR: No history received\n\n", mimetype="text/event-stream")

    try:
        r = requests.post(
            f"{GEMINI_API_URL}?key={GEMINI_API_KEY}",
            headers={"Content-Type": "application/json"},
            json=latest_history,
            timeout=30
        )
        r.raise_for_status()
        result = r.json()

        # extract text safely
        text = (
            result.get("candidates", [{}])[0]
            .get("content", {})
            .get("parts", [{}])[0]
            .get("text", "")
        )

        if not text:
            return Response("data: ERROR: Empty response\n\n", mimetype="text/event-stream")

        # stream word-by-word
        def generate():
            words = text.split()
            chunk_size = 5
            for i in range(0, len(words), chunk_size):
                chunk = " ".join(words[i:i+chunk_size])
                yield f"data: {chunk}\n\n"
                time.sleep(0.5)
            yield "data: [END]\n\n"

        return Response(stream_with_context(generate()), mimetype="text/event-stream")

    except Exception as e:
        return Response(f"data: ERROR: {str(e)}\n\n", mimetype="text/event-stream")

# --------------------- EXTERNAL SERVICES ---------------------

from exa_py import Exa
exa_api = os.getenv("EXA_API_KEY")
exa = Exa(api_key=exa_api)

from openai import OpenAI
client = OpenAI(
    base_url="https://api.exa.ai",
    api_key=exa_api,
)

from pinecone import Pinecone
pine_api = os.getenv("PINECONE_API_KEY")
pc = Pinecone(api_key=pine_api)
index = pc.Index(host="avenchatbot-rz0q9xs.svc.aped-4627-b74a.pinecone.io")

from daytona import Daytona, DaytonaConfig
config = DaytonaConfig(api_key=os.getenv("DAYTONA_API_KEY"))
daytona = Daytona(config)

import replicate
REPLICATE_API_TOKEN = os.getenv("REPLICATE_API_TOKEN")

from langgraph.graph import StateGraph, START, END
from typing import TypedDict, List, Dict, Any

# --------------------- AGENT SETUP ---------------------

class TextAgent():
    def _init_(self, model_name, system_prompt):
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
            x += str(event)
        return x

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
    2. vector: search vectorDB.
    3. web: search web.
    4. research: call the research model.
    5. analyse: call the analyzer model.

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
    
    @ INPUTS
    You are provided with the user prompt, last few messages (if any),
    as well as a log of assistants/tools you have called, along with your instructions and their outputs (if any).
    Do not call the same tool consecutively.

    """
)

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

class CB(TypedDict):
    messages: List[str]
    output: str
    tool_logs: List[Dict[str, Any]]   # fixed: was list[str, str]
    response: str

def start(state: CB):
    prompt = f"""
    ### CONVERSATION
    {state['messages']}

    ### TOOL LOGS
    {state['tool_logs']}
    """
    print("PROMPT: ", prompt)
    return {
        "output": Router.gen(prompt)
    }

def router(state: CB) -> str:
    print("ROUTER INVOKED")
    output = state["output"]
    print(output)
    output = json.loads(output)
    print("JSON PARSING: ", output)
    return output["type"]

def web_search(state: CB):
    print("WEB SEARCH INVOKED")
    query = json.loads(state["output"])["output"]
    result = exa.search_and_contents(
        query,
        text=True,
        type="auto",
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
    })
    return {
        "tool_logs": logs
    }

def research(state: CB):
    print("RESEARCH INVOKED")
    query = json.loads(state["output"])["output"]
    research = exa.research.create(
        instructions=query,
        model="exa-research",
    )
    x = ''
    for event in exa.research.get(research.research_id, stream=True):
        x += str(event)
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

agent_graph = StateGraph(CB)
agent_graph.add_node("start", start)
agent_graph.add_node("reply", reply)
agent_graph.add_node("web", web_search)
agent_graph.add_node("research", research)

agent_graph.add_edge(START, "start")
agent_graph.add_conditional_edges(
    "start",
    router,
    {
        "reply": "reply",
        "analyse": "reply",
        "vector": "reply",
        "web": "web",
        "research": "research"
    }
)
agent_graph.add_edge("reply", END)
agent_graph.add_edge("web", "start")
agent_graph.add_edge("research", "start")
agent = agent_graph.compile()

# keep your CLI prompt, but only run it when you WANT to (no server block)
if os.getenv("CLI_AGENT") == "1":
    msg = input("Whats your query?: ")
    response = agent.invoke({
        "messages": msg,
        "output": "",
        "tool_logs": [],
        "response": ""
    })
    print(response["response"])

# --------------------- FLASK ROUTES (UI + MOCK SSE) ---------------------

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload')  # basic logic 
def uploadpage():
    return " "

@app.route("/admin", methods=['POST', 'GET'])
def file_upload():
    # make this syntactically valid; keep the “unsupported” spirit
    if request.method == 'GET':
        return "Upload via POST", 405
    if 'file' not in request.files:
        return "Unsupported file type", 400
    # handle file here if needed
    return "OK", 200

@app.route('/respond')
def respond():
    return jsonify({
        "success": True,
        "message": "Default response"
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
