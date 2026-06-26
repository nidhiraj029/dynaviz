import math
import time
import heapq
import random
from collections import deque
from pydantic import BaseModel
from typing import List, Optional, Tuple, Dict, Set

# Pydantic Schemas
class Point(BaseModel):
    x: int
    y: int

    class Config:
        frozen = True

class PathRequest(BaseModel):
    width: int
    height: int
    start: Point
    end: Point
    walls: List[Point]
    weights: List[Point]
    algorithm: str  # "bfs", "dfs", "dijkstra", "astar", "gbfs", "bidirectional_bfs"
    heuristic: Optional[str] = "manhattan"

class PathResponse(BaseModel):
    visited: List[Point]
    path: Optional[List[Point]]
    execution_time_ms: float
    nodes_visited_count: int
    path_length: int  # cost-adjusted length
    max_frontier_size: int
    space_complexity_observed_nodes: int
    avg_branching_factor: float

class MazeRequest(BaseModel):
    width: int
    height: int
    algorithm: str  # "recursive_backtracking", "prims", "kruskals"

class MazeResponse(BaseModel):
    walls: List[Point]
    paths: List[Point]
    execution_time_ms: float

# Constants
NEIGHBORS = [
    (0, -1), # Up (y decreases)
    (0, 1),  # Down (y increases)
    (-1, 0), # Left (x decreases)
    (1, 0)   # Right (x increases)
]

def get_heuristic(curr: Tuple[int, int], target: Tuple[int, int], type_: str) -> float:
    dx = abs(curr[0] - target[0])
    dy = abs(curr[1] - target[1])
    if type_ == "manhattan":
        return dx + dy
    elif type_ == "euclidean":
        return math.sqrt(dx * dx + dy * dy)
    elif type_ == "chebyshev":
        return max(dx, dy)
    return dx + dy

def reconstruct_path(parent_map: Dict[Tuple[int, int], Tuple[int, int]], current: Tuple[int, int], start: Tuple[int, int]) -> List[Tuple[int, int]]:
    path = []
    curr = current
    while curr is not None:
        path.append(curr)
        curr = parent_map.get(curr)
        if curr == start:
            path.append(start)
            break
    path.reverse()
    return path

def calculate_path_cost(path: List[Tuple[int, int]], weights: Set[Tuple[int, int]]) -> int:
    if not path or len(path) <= 1:
        return 0
    # Cost to start is 0, then add costs of all subsequent steps
    cost = 0
    for node in path[1:]:
        cost += 5 if node in weights else 1
    return cost

# Disjoint Set Union for Kruskal's
class DSU:
    def __init__(self, size: int):
        self.parent = list(range(size))
        self.rank = [0] * size

    def find(self, i: int) -> int:
        if self.parent[i] == i:
            return i
        self.parent[i] = self.find(self.parent[i])
        return self.parent[i]

    def union(self, i: int, j: int) -> bool:
        root_i = self.find(i)
        root_j = self.find(j)
        if root_i != root_j:
            if self.rank[root_i] < self.rank[root_j]:
                self.parent[root_i] = root_j
            elif self.rank[root_i] > self.rank[root_j]:
                self.parent[root_j] = root_i
            else:
                self.parent[root_j] = root_i
                self.rank[root_i] += 1
            return True
        return False

# Pathfinders
def solve_pathfinding(req: PathRequest) -> PathResponse:
    start_time = time.perf_counter()

    width = req.width
    height = req.height
    start = (req.start.x, req.start.y)
    end = (req.end.x, req.end.y)
    walls = {(w.x, w.y) for w in req.walls}
    weights = {(wt.x, wt.y) for wt in req.weights}
    algorithm = req.algorithm.lower()
    heuristic_type = req.heuristic.lower() if req.heuristic else "manhattan"

    visited_order = []
    parent_map = {}
    path = None
    max_frontier_size = 0
    expanded_count = 0
    total_branching_factor = 0
    observed_nodes = set([start])

    if algorithm == "bfs":
        queue = deque([start])
        visited = set()
        while queue:
            max_frontier_size = max(max_frontier_size, len(queue))
            curr = queue.popleft()
            if curr in visited:
                continue
            visited.add(curr)
            visited_order.append(curr)
            expanded_count += 1

            if curr == end:
                path = reconstruct_path(parent_map, end, start)
                break

            valid_neighbors = 0
            for dx, dy in NEIGHBORS:
                nx, ny = curr[0] + dx, curr[1] + dy
                n = (nx, ny)
                if 0 <= nx < width and 0 <= ny < height and n not in walls:
                    valid_neighbors += 1
                    if n not in observed_nodes:
                        parent_map[n] = curr
                        queue.append(n)
                        observed_nodes.add(n)
            total_branching_factor += valid_neighbors

    elif algorithm == "dfs":
        stack = [start]
        visited = set()
        while stack:
            max_frontier_size = max(max_frontier_size, len(stack))
            curr = stack.pop()
            if curr in visited:
                continue
            visited.add(curr)
            visited_order.append(curr)
            expanded_count += 1

            if curr == end:
                path = reconstruct_path(parent_map, end, start)
                break

            valid_neighbors = 0
            neighbors_to_push = []
            for dx, dy in NEIGHBORS:
                nx, ny = curr[0] + dx, curr[1] + dy
                n = (nx, ny)
                if 0 <= nx < width and 0 <= ny < height and n not in walls:
                    valid_neighbors += 1
                    if n not in visited:
                        neighbors_to_push.append(n)
                        parent_map[n] = curr
            total_branching_factor += valid_neighbors

            # Push in reverse to pop in standard order
            for n in reversed(neighbors_to_push):
                stack.append(n)
                observed_nodes.add(n)

    elif algorithm == "dijkstra":
        heap = [(0, start[0], start[1])] # (dist, x, y)
        distances = {start: 0}
        visited = set()
        while heap:
            max_frontier_size = max(max_frontier_size, len(heap))
            dist, cx, cy = heapq.heappop(heap)
            curr = (cx, cy)
            if curr in visited:
                continue
            visited.add(curr)
            visited_order.append(curr)
            expanded_count += 1

            if curr == end:
                path = reconstruct_path(parent_map, end, start)
                break

            valid_neighbors = 0
            for dx, dy in NEIGHBORS:
                nx, ny = cx + dx, cy + dy
                n = (nx, ny)
                if 0 <= nx < width and 0 <= ny < height and n not in walls:
                    valid_neighbors += 1
                    cost = 5 if n in weights else 1
                    new_dist = dist + cost
                    if new_dist < distances.get(n, float('inf')):
                        distances[n] = new_dist
                        parent_map[n] = curr
                        heapq.heappush(heap, (new_dist, nx, ny))
                        observed_nodes.add(n)
            total_branching_factor += valid_neighbors

    elif algorithm == "astar":
        h = get_heuristic(start, end, heuristic_type)
        heap = [(h, 0, start[0], start[1])] # (f, g, x, y)
        g_scores = {start: 0}
        visited = set()
        while heap:
            max_frontier_size = max(max_frontier_size, len(heap))
            f, g, cx, cy = heapq.heappop(heap)
            curr = (cx, cy)
            if curr in visited:
                continue
            visited.add(curr)
            visited_order.append(curr)
            expanded_count += 1

            if curr == end:
                path = reconstruct_path(parent_map, end, start)
                break

            valid_neighbors = 0
            for dx, dy in NEIGHBORS:
                nx, ny = cx + dx, cy + dy
                n = (nx, ny)
                if 0 <= nx < width and 0 <= ny < height and n not in walls:
                    valid_neighbors += 1
                    cost = 5 if n in weights else 1
                    new_g = g + cost
                    if new_g < g_scores.get(n, float('inf')):
                        g_scores[n] = new_g
                        parent_map[n] = curr
                        new_f = new_g + get_heuristic(n, end, heuristic_type)
                        heapq.heappush(heap, (new_f, new_g, nx, ny))
                        observed_nodes.add(n)
            total_branching_factor += valid_neighbors

    elif algorithm == "gbfs":
        h = get_heuristic(start, end, heuristic_type)
        heap = [(h, start[0], start[1])] # (h, x, y)
        visited = set()
        while heap:
            max_frontier_size = max(max_frontier_size, len(heap))
            h_val, cx, cy = heapq.heappop(heap)
            curr = (cx, cy)
            if curr in visited:
                continue
            visited.add(curr)
            visited_order.append(curr)
            expanded_count += 1

            if curr == end:
                path = reconstruct_path(parent_map, end, start)
                break

            valid_neighbors = 0
            for dx, dy in NEIGHBORS:
                nx, ny = cx + dx, cy + dy
                n = (nx, ny)
                if 0 <= nx < width and 0 <= ny < height and n not in walls:
                    valid_neighbors += 1
                    if n not in visited and n not in observed_nodes:
                        parent_map[n] = curr
                        h_next = get_heuristic(n, end, heuristic_type)
                        heapq.heappush(heap, (h_next, nx, ny))
                        observed_nodes.add(n)
            total_branching_factor += valid_neighbors

    elif algorithm == "bidirectional_bfs":
        # Forward search
        q_f = deque([start])
        visited_f = set([start])
        parent_f = {start: None}

        # Backward search
        q_b = deque([end])
        visited_b = set([end])
        parent_b = {end: None}

        observed_nodes = set([start, end])
        intersect_node = None

        while q_f and q_b:
            max_frontier_size = max(max_frontier_size, len(q_f) + len(q_b))

            # Expand Forward
            curr_f = q_f.popleft()
            visited_order.append(curr_f)
            expanded_count += 1
            if curr_f in visited_b:
                intersect_node = curr_f
                break

            valid_neighbors = 0
            for dx, dy in NEIGHBORS:
                nx, ny = curr_f[0] + dx, curr_f[1] + dy
                n = (nx, ny)
                if 0 <= nx < width and 0 <= ny < height and n not in walls:
                    valid_neighbors += 1
                    if n not in visited_f:
                        visited_f.add(n)
                        parent_f[n] = curr_f
                        q_f.append(n)
                        observed_nodes.add(n)
            total_branching_factor += valid_neighbors

            # Expand Backward
            curr_b = q_b.popleft()
            visited_order.append(curr_b)
            expanded_count += 1
            if curr_b in visited_f:
                intersect_node = curr_b
                break

            valid_neighbors = 0
            for dx, dy in NEIGHBORS:
                nx, ny = curr_b[0] + dx, curr_b[1] + dy
                n = (nx, ny)
                if 0 <= nx < width and 0 <= ny < height and n not in walls:
                    valid_neighbors += 1
                    if n not in visited_b:
                        visited_b.add(n)
                        parent_b[n] = curr_b
                        q_b.append(n)
                        observed_nodes.add(n)
            total_branching_factor += valid_neighbors

        if intersect_node is not None:
            # Reconstruct forward part
            path_f = []
            curr = intersect_node
            while curr is not None:
                path_f.append(curr)
                curr = parent_f.get(curr)
            path_f.reverse()

            # Reconstruct backward part
            path_b = []
            curr = parent_b.get(intersect_node)
            while curr is not None:
                path_b.append(curr)
                curr = parent_b.get(curr)

            path = path_f + path_b

    end_time = time.perf_counter()
    execution_time_ms = (end_time - start_time) * 1000.0

    path_points = [Point(x=p[0], y=p[1]) for p in path] if path else None
    visited_points = [Point(x=p[0], y=p[1]) for p in visited_order]
    path_cost = calculate_path_cost(path, weights) if path else 0
    avg_branch = total_branching_factor / expanded_count if expanded_count > 0 else 0.0

    return PathResponse(
        visited=visited_points,
        path=path_points,
        execution_time_ms=round(execution_time_ms, 3),
        nodes_visited_count=len(visited_order),
        path_length=path_cost,
        max_frontier_size=max_frontier_size,
        space_complexity_observed_nodes=len(observed_nodes),
        avg_branching_factor=round(avg_branch, 2)
    )

# Maze Generators
def generate_maze(req: MazeRequest) -> MazeResponse:
    start_time = time.perf_counter()

    width = req.width
    height = req.height
    algorithm = req.algorithm.lower()

    # Initial grid: all walls (1)
    grid = [[1 for _ in range(width)] for _ in range(height)]

    # Start room (1, 1) is a passage (0)
    grid[1][1] = 0

    if algorithm == "recursive_backtracking":
        # Stack for DFS carving
        stack = [(1, 1)]
        visited_rooms = set([(1, 1)])

        while stack:
            cx, cy = stack[-1]
            unvisited_neighbors = []

            # 2 steps away
            moves = [
                (0, -2), # Up
                (0, 2),  # Down
                (-2, 0), # Left
                (2, 0)   # Right
            ]

            for dx, dy in moves:
                nx, ny = cx + dx, cy + dy
                if 0 < nx < width - 1 and 0 < ny < height - 1:
                    if (nx, ny) not in visited_rooms:
                        unvisited_neighbors.append((nx, ny, dx, dy))

            if unvisited_neighbors:
                nx, ny, dx, dy = random.choice(unvisited_neighbors)
                # Carve wall in between
                grid[cy + dy // 2][cx + dx // 2] = 0
                grid[ny][nx] = 0
                visited_rooms.add((nx, ny))
                stack.append((nx, ny))
            else:
                stack.pop()

    elif algorithm == "prims":
        visited_rooms = set([(1, 1)])
        walls_list = []

        # Helper to add walls
        def add_walls(x, y):
            moves = [
                (0, -2), (0, 2), (-2, 0), (2, 0)
            ]
            for dx, dy in moves:
                nx, ny = x + dx, y + dy
                if 0 < nx < width - 1 and 0 < ny < height - 1:
                    if (nx, ny) not in visited_rooms:
                        walls_list.append(((x + dx // 2, y + dy // 2), (nx, ny)))

        add_walls(1, 1)

        while walls_list:
            rand_idx = random.randrange(len(walls_list))
            (wx, wy), (nx, ny) = walls_list.pop(rand_idx)

            if (nx, ny) not in visited_rooms:
                grid[wy][wx] = 0
                grid[ny][nx] = 0
                visited_rooms.add((nx, ny))
                add_walls(nx, ny)

    elif algorithm == "kruskals":
        # Passages initially at all rooms (odd coordinates)
        rooms = []
        room_to_idx = {}
        idx = 0

        for y in range(1, height - 1, 2):
            for x in range(1, width - 1, 2):
                rooms.append((x, y))
                room_to_idx[(x, y)] = idx
                grid[y][x] = 0
                idx += 1

        dsu = DSU(len(rooms))
        edges = []

        for x, y in rooms:
            u = room_to_idx[(x, y)]
            # Edge down
            if y + 2 < height - 1:
                v = room_to_idx[(x, y + 2)]
                edges.append((u, v, (x, y + 1)))
            # Edge right
            if x + 2 < width - 1:
                v = room_to_idx[(x + 2, y)]
                edges.append((u, v, (x + 1, y)))

        random.shuffle(edges)

        for u, v, (wx, wy) in edges:
            if dsu.union(u, v):
                grid[wy][wx] = 0

    end_time = time.perf_counter()
    execution_time_ms = (end_time - start_time) * 1000.0

    walls_out = []
    paths_out = []
    for y in range(height):
        for x in range(width):
            if grid[y][x] == 1:
                walls_out.append(Point(x=x, y=y))
            else:
                paths_out.append(Point(x=x, y=y))

    return MazeResponse(
        walls=walls_out,
        paths=paths_out,
        execution_time_ms=round(execution_time_ms, 3)
    )
