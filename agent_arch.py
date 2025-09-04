import os
from dotenv import load_dotenv
load_dotenv()
import json

from exa_py import Exa
exa_api = os.getenv("EXA_API_KEY")
exa = Exa(api_key = exa_api)

from openai import OpenAI
client = OpenAI(
    base_url = "https://api.exa.ai",
    api_key = exa_api,
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
from typing import TypedDict

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

msg = input("Whats your query?: ")

response = agent.invoke({
    "messages": msg,
    "output": "",
    "tool_logs": [],
    "response": ""
})
print(response["response"])
