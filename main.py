import uuid
from fastapi import FastAPI, HTTPException, Body
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Tuple
import os

from database import fetch_all_mazes, create_maze, remove_maze
from solver import PathRequest, PathResponse, MazeRequest, MazeResponse, solve_pathfinding, generate_maze


app = FastAPI(title="DynaViz API", description="Backend API for saving and loading maze configurations.")

# Configure CORS
allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "http://localhost:8000,http://127.0.0.1:8000")
allowed_origins = [origin.strip() for origin in allowed_origins_env.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic Schemas for validation
class MazeCreate(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    grid_width: int
    grid_height: int
    start_node: List[int] # [row, col]
    target_node: List[int] # [row, col]
    walls: List[List[int]] # [[r, c], ...]
    weights: List[List[int]] # [[r, c, w], ...]

@app.get("/api/mazes")
def get_mazes():
    try:
        return fetch_all_mazes()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/mazes")
def save_maze(maze: MazeCreate):
    try:
        success = create_maze(maze.model_dump())
        if not success:
            raise HTTPException(status_code=400, detail="Failed to save maze config")
        return {"status": "success", "id": maze.id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/mazes/{maze_id}")
def delete_maze(maze_id: str):
    try:
        success = remove_maze(maze_id)
        if not success:
            raise HTTPException(status_code=404, detail="Maze configuration not found")
        return {"status": "success", "message": f"Maze {maze_id} deleted."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/solve", response_model=PathResponse)
def solve_path(req: PathRequest):
    try:
        return solve_pathfinding(req)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/generate-maze", response_model=MazeResponse)
def get_generated_maze(req: MazeRequest):
    try:
        return generate_maze(req)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Serve static files
# Ensure static directory exists
os.makedirs("static", exist_ok=True)

@app.get("/")
def serve_index():
    return FileResponse("static/index.html")

# Mount remaining static assets
app.mount("/", StaticFiles(directory="static"), name="static")
