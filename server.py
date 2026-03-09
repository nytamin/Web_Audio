from flask import Flask, send_from_directory

app = Flask(__name__)

@app.route("/")
def index():
    return send_from_directory("static", "index.html")

@app.route("/audio/<path:filename>")
def audio(filename):
    return send_from_directory("static/audio", filename)

app.run(port=8000,debug=True)