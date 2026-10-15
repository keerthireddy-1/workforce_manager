import json
import os
import uuid
from datetime import datetime, timezone

from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

DATA_FILE = os.path.join(os.path.dirname(__file__), "projects.json")


# ---- STORAGE LAYER (swap these functions for Databricks later) ----
def load_projects():
    if not os.path.exists(DATA_FILE):
        return []
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def save_project(project):
    projects = load_projects()
    projects.insert(0, project)
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(projects, f, indent=2)


def load_existing_projects():
    # PLACEHOLDER catalog of existing projects.
    # Later: replace with a SELECT from your Databricks existing-projects table.
    return [
        {
            "name": "ShiftMaster Roster Rollout",
            "description": "Weekly shift roster planning and auto-fill for operations.",
            "status": "active",
            "startDate": "2026-09-01",
            "endDate": "2026-12-31",
            "requiredSkills": ["Scheduling", "Operations"],
            "teamSize": 6,
        },
        {
            "name": "Skills & Upskilling Program",
            "description": "Track employee skills and training gaps.",
            "status": "active",
            "startDate": "2026-08-15",
            "endDate": "2027-02-28",
            "requiredSkills": ["Training", "Analytics"],
            "teamSize": 4,
        },
        {
            "name": "Attendance Analytics",
            "description": "Dashboards for attendance and workload trends.",
            "status": "planning",
            "startDate": "2026-11-01",
            "endDate": "2027-01-31",
            "requiredSkills": ["Python", "Data Analysis"],
            "teamSize": 3,
        },
    ]
# -------------------------------------------------------------------


@app.get("/api/projects")
def list_projects():
    return jsonify(load_projects())


@app.get("/api/existing-projects")
def list_existing_projects():
    added = {p["name"].lower() for p in load_projects()}
    available = [p for p in load_existing_projects() if p["name"].lower() not in added]
    return jsonify(available)


@app.post("/api/projects")
def create_project():
    data = request.get_json() or {}
    if not data.get("name"):
        return jsonify({"error": "name is required"}), 400

    project = {
        "id": str(uuid.uuid4()),
        "name": data["name"],
        "description": data.get("description", ""),
        "status": data.get("status", "planning"),
        "startDate": data.get("startDate", ""),
        "endDate": data.get("endDate", ""),
        "requiredSkills": data.get("requiredSkills", []),
        "teamSize": int(data.get("teamSize", 0)),
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }
    save_project(project)
    return jsonify(project), 201


if __name__ == "__main__":
    app.run(port=5000, debug=True)