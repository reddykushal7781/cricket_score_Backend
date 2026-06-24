# Frontend Integration - Backend Changes Reference Guide

This document outlines the updates, new endpoints, and payload formatting changes introduced in the backend codebase during this iteration. Use this reference to update your Flutter frontend models, services, and view states.

---

## 📌 1. Authentication & Register Updates

* **Authentication Endpoint**: `POST /api/auth/register`
* **Changes**:
  * The backend now automatically checks for or creates a corresponding **`Player`** profile matching the registered `username`.
  * If a matching player already existed in database scorecards (e.g., created as guest/unknown during a match upload), it links their `username` parameter to their existing profile.

---

## 📌 2. Player Roster & Search API Updates

* **Endpoints**: 
  * `GET /api/players/search?q=Koh`
  * `GET /api/players/:name/profile`
* **Changes**:
  * **Search**: The `/search` query parameter `q` matches case-insensitively against both the player's full `name` AND their `username`.
  * **Profile Path**: The path variable `:name` accepts either the player's full `name` OR their `username` (handles spaces and URL-decoding automatically).
  * **Model Properties**:
    * ⚠️ The `email` property has been **removed** from the Player schema.
    * ➡️ A new **`username`** property (string) has been added in its place.
    * **Profile JSON Payload format**:
      ```json
      {
        "username": "virat_username",
        "name": "Virat Kohli",
        "avatarUrl": "https://images.unsplash.com/...",
        "role": "Top-order Batsman",
        "battingStyle": "Right-hand bat",
        "bowlingStyle": "Right-arm medium",
        "stats": { ... }
      }
      ```

---

## 📌 3. New Endpoints Added

### A. Get Player Match History
* **Endpoint**: `GET /api/players/:name/matches` (Authenticated)
* **Description**: Returns a chronologically sorted list of matches the player participated in, containing basic scorecard headers and their specific performance stats.
* **Payload Shape**:
  ```json
  [
    {
      "matchId": 14,
      "date": "2026-06-24",
      "teamAName": "Chennai Super Kings",
      "teamBName": "Royal Challengers Bangalore",
      "teamAScore": 85,
      "teamAWickets": 4,
      "teamBScore": 81,
      "teamBWickets": 6,
      "winner": "Chennai Super Kings",
      "playerOfTheMatch": "Kushal Reddy",
      "oversCount": 5,
      "playerPerformance": {
        "batted": true,
        "bowled": true,
        "runs": 45,
        "balls": 20,
        "fours": 4,
        "sixes": 2,
        "isOut": true,
        "dismissalType": "caught",
        "dismissedBy": "Jasprit Bumrah",
        "fielderName": "Siva",
        "dismissalSummary": "c Siva b Jasprit Bumrah",
        "wickets": 1,
        "runsConceded": 12,
        "ballsBowled": 6,
        "maidens": 0,
        "economy": 12.0
      }
    }
  ]
  ```

### B. Cricbuzz-Style Match Details
* **Endpoint**: `GET /api/matches/:matchId` (Authenticated)
* **Description**: Fetches scorecards, innings, generated result margin summaries, and top performer stats.
* **Key Additions**:
  * **`summary`** (string): Calculated margin text, e.g. `"Chennai Super Kings won by 4 runs"` or `"Chennai Super Kings won by 4 wickets"`.
  * **`topPerformers`** (object): Highlights the highest batting and bowling stats of the match:
    ```json
    "topPerformers": {
      "batsman": { "name": "Kushal Reddy", "runs": 40, "balls": 16, "strikeRate": 250 },
      "bowler": { "name": "Roopesh", "wickets": 2, "runsConceded": 25, "balls": 12 }
    }
    ```

### C. Undo / Delete Match
* **Endpoint**: `DELETE /api/matches/:matchId` (Authenticated)
* **Description**: Deletes a match and fully subtracts all batting, bowling, and fielding numbers from player career aggregates.
* **Recalculation Rules**:
  * Averages and strike-rates are recalculated.
  * If the deleted match contained the player's `highestScore` or `bestBowling`, the backend queries all other matches to reset it to their next best performance.
  * Cleans up guest accounts ending in `(unknown)` if they have no remaining matches.

---

## 📌 4. Wicket & Dismissal Scorecard Enrichment

* **Affected Endpoints**:
  * `GET /api/matches/:matchId` (in `match.innings.battingScorecard`)
  * `GET /api/players/:name/matches` (in `playerPerformance`)
* **Newly Returned Properties**:
  * **`fielderName`** (string, nullable): Name of the catcher, stumper, or fielder involved in run-outs.
  * **`dismissalSummary`** (string): Standard formatted text representation of the wicket:
    * `"not out"` $\rightarrow$ Batsman not dismissed
    * `"b <bowler>"` $\rightarrow$ Bowled
    * `"c <fielder> b <bowler>"` $\rightarrow$ Caught by fielder
    * `"c & b <bowler>"` $\rightarrow$ Caught & Bowled by bowler
    * `"stumped <fielder> b <bowler>"` $\rightarrow$ Stumped by wicketkeeper
    * `"run out (<fielder>)"` $\rightarrow$ Run out by fielder
    * `"retired hurt"` / `"retired out"`
