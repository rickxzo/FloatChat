import pandas as pd
import time
from flask import Flask, render_template, request, jsonify, Response, stream_with_context
from flask_cors import CORS
import os
from dotenv import load_dotenv
import json
import requests
from flask import Flask, send_from_directory
import google.generativeai as genai
import re

# load env once
load_dotenv()

app = Flask(_name_, static_folder="dist", template_folder="dist")      
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

genai.configure(api_key=GEMINI_API_KEY)

# --------------------- GEMINI SSE PAIR ---------------------

@app.route("/api/stream", methods=["POST"])
def store_history():
    global latest_history
    latest_history = request.get_json()
    return {"status": "ok"}


@app.route("/api/stream", methods=["GET"])
def gemini_stream():
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

        # stream by paragraphs/lines instead of words
        def generate():
            # Ensure there's a newline before numbered points (handles single and multiple digits)
            processed_text = re.sub(r"(?<!\n)(\b\d{1,3}\.\s+)", r"\n\1", text)

            # Ensure there's a newline before bullets (handles - and •)
            processed_text = re.sub(r"(?<!\n)([-•]\s+)", r"\n\1", processed_text)

            # Trim leading/trailing whitespace
            processed_text = processed_text.strip()

            # Split into lines
            lines = processed_text.split("\n")

            for line in lines:
                if line.strip():
                    yield f"data: {line.strip()}\n\n"
                    time.sleep(0.05)

            yield "data: [END]\n\n"



        return Response(stream_with_context(generate()), mimetype="text/event-stream")

    except Exception as e:
        return Response(f"data: ERROR: {str(e)}\n\n", mimetype="text/event-stream")

    
@app.route("/api/study-stream", methods=["POST"])
def study_stream():
    data = request.json
    message = data.get("message")
    if not message:
        return Response("data: ERROR: No message provided\n\n", mimetype="text/event-stream")

    try:
        raw = Router.gen(message)
        try:
            parsed = json.loads(raw)
            output_text = parsed.get("output", raw)
        except Exception:
            output_text = raw

        if not output_text:
            return Response("data: ERROR: Empty output\n\n", mimetype="text/event-stream")

        # stream by paragraphs/lines instead of words
        def generate():
            # Ensure there's a newline before numbered points (handles single and multiple digits)
            processed_text = re.sub(r"(?<!\n)(\b\d{1,3}\.\s+)", r"\n\1", output_text)

            # Ensure there's a newline before bullets (handles - and •)
            processed_text = re.sub(r"(?<!\n)([-•]\s+)", r"\n\1", processed_text)

            # Trim leading/trailing whitespace
            processed_text = processed_text.strip()

            # Split into lines
            lines = processed_text.split("\n")

            for line in lines:
                if line.strip():
                    yield f"data: {line.strip()}\n\n"
                    time.sleep(0.05)

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
        x = x.replace("\\", "\\\\")
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

@app.route("/api/study", methods=["POST"])
def study_mode():
    data = request.get_json()
    user_msg = data.get("message", "")

    response = agent.invoke({
        "messages": [user_msg],
        "output": "",
        "tool_logs": [],
        "response": ""
    })

    # Parse the stringified JSON
    try:
        parsed = json.loads(response["response"])
        raw_text = parsed.get("output", "")
    except Exception:
        raw_text = response["response"]

    # Clean the formatting
    clean_text = raw_text.replace("\\n", "\n").replace("\\", "")

    # Return ONLY the plain text (as string, not wrapped in an object)
    return clean_text, 200, {"Content-Type": "text/plain"}


# make sure you configure your API key once
@app.route("/api/rename", methods=["POST"])
def rename_chat():
    data = request.json
    user_msg = data.get("user", "").strip()
    bot_msg = data.get("bot", "").strip()
    mode = data.get("mode", "chat")

    if not user_msg or not bot_msg:
        return jsonify({"title": "New Chat"})

    prompt = (
        f"Summarize this {mode} conversation into a short 3-5 word title.\n\n"
        f"User: {user_msg}\n"
        f"Bot: {bot_msg}\n\n"
        f"Title:"
    )

    try:
        model = genai.GenerativeModel("gemini-2.0-flash")
        resp = model.generate_content(
            prompt,
            generation_config={
                "temperature": 0.3,
                "max_output_tokens": 20
            }
        )

        raw_title = (resp.text or "").strip().split("\n")[0]
        words = raw_title.split()
        title = " ".join(words[:5]) if words else "New Chat"

    except Exception as e:
        print("Gemini rename error:", e, "| Mode:", mode)
        title = "New Chat"

    return jsonify({"title": title})




if _name_ == '_main_':
    app.run(host='0.0.0.0', port=5000, debug=True)
