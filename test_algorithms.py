import pytest
from solver import (
    Point, PathRequest, solve_pathfinding,
    MazeRequest, generate_maze
)

def test_pathfinding_bfs():
    # 5x5 grid, clear path
    req = PathRequest(
        width=5,
        height=5,
        start=Point(x=0, y=0),
        end=Point(x=4, y=4),
        walls=[],
        weights=[],
        algorithm="bfs"
    )
    res = solve_pathfinding(req)
    assert res.path is not None
    assert len(res.path) == 9 # (0,0) -> (4,4) is 9 points (8 steps)
    assert res.path[0] == Point(x=0, y=0)
    assert res.path[-1] == Point(x=4, y=4)
    assert res.path_length == 8 # 8 empty nodes * 1 = 8 cost

def test_pathfinding_blocked():
    # Blocked by walls
    req = PathRequest(
        width=3,
        height=3,
        start=Point(x=0, y=0),
        end=Point(x=2, y=2),
        walls=[Point(x=0, y=1), Point(x=1, y=1), Point(x=2, y=1)],
        weights=[],
        algorithm="bfs"
    )
    res = solve_pathfinding(req)
    assert res.path is None
    assert res.path_length == 0

def test_pathfinding_dijkstra_weights():
    # Dijkstra choosing path around weighted nodes
    # Grid:
    # S W .
    # . W .
    # . . E
    # If W (x=1, y=0) and W (x=1, y=1) are weights of cost 5:
    # Going direct: S -> W -> E is cost 1 + 5 = 6.
    # Going around: S -> (0,1) -> (0,2) -> (1,2) -> E is cost 4.
    req = PathRequest(
        width=3,
        height=3,
        start=Point(x=0, y=0),
        end=Point(x=2, y=2),
        walls=[],
        weights=[Point(x=1, y=0), Point(x=1, y=1)],
        algorithm="dijkstra"
    )
    res = solve_pathfinding(req)
    assert res.path is not None
    # Path should go around weight: (0,0) -> (0,1) -> (0,2) -> (1,2) -> (2,2)
    assert len(res.path) == 5
    assert res.path_length == 4

def test_bidirectional_bfs():
    req = PathRequest(
        width=5,
        height=5,
        start=Point(x=0, y=0),
        end=Point(x=4, y=4),
        walls=[],
        weights=[],
        algorithm="bidirectional_bfs"
    )
    res = solve_pathfinding(req)
    assert res.path is not None
    assert len(res.path) == 9
    assert res.path[0] == Point(x=0, y=0)
    assert res.path[-1] == Point(x=4, y=4)

def test_recursive_backtracking_maze():
    req = MazeRequest(width=21, height=21, algorithm="recursive_backtracking")
    res = generate_maze(req)
    assert len(res.walls) > 0
    assert len(res.paths) > 0
    # Start room (1, 1) should be in paths
    assert Point(x=1, y=1) in res.paths

def test_prims_maze():
    req = MazeRequest(width=21, height=21, algorithm="prims")
    res = generate_maze(req)
    assert len(res.walls) > 0
    assert len(res.paths) > 0
    assert Point(x=1, y=1) in res.paths

def test_kruskals_maze():
    req = MazeRequest(width=21, height=21, algorithm="kruskals")
    res = generate_maze(req)
    assert len(res.walls) > 0
    assert len(res.paths) > 0
    assert Point(x=1, y=1) in res.paths
