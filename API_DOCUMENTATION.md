# Cricket Score App - Backend API Integration Document

This document outlines the API specifications, request payloads, response payloads, and data structures for the Cricket Score backend.

---

## 🔑 Authentication Scheme

All secured routes require a JSON Web Token (JWT) passed in the HTTP Authorization header:

* **Header Key**: `Authorization`
* **Header Value**: `Bearer <your_jwt_token>`

---

## 🧭 API Endpoint Index

### 1. Authentication APIs
* [POST /api/auth/register](#1-register-user) - Register a new account
* [POST /api/auth/login](#2-login-user) - Login to get Bearer Token

### 2. Player Roster & Profile APIs
* [GET /api/players/search](#3-search-roster-players) - Search players by name or username
* [GET /api/players/:name/profile](#4-get-player-profile) - Get player's aggregate career statistics
* [GET /api/players/:name/matches](#5-get-player-match-history) - Get match logs and scorecard records for a player

### 3. Match Management APIs
* [POST /api/matches/publish](#6-publish-match-results) - Sync completed match scorecards and update career stats
* [GET /api/matches/:matchId](#7-get-match-details) - Get rich scorecard, result summary, and top performers
* [DELETE /api/matches/:matchId](#8-undo-match-results) - Delete a match and revert all stats modifications

### 4. Leaderboard & Stats Dashboard APIs
* [GET /api/stats/days](#9-get-stats-dashboard--match-days) - Get list of match days and match counts
* [GET /api/stats/performers](#10-get-top-performers-of-the-day) - Get top batsmen, bowlers, and dot-ball specialists for a date

### 5. Utility APIs
* [GET /api/health](#11-health-check) - Health check ping

---

## 🛠️ API Reference Detail

### 1. Register User
* **Method**: `POST`
* **URL**: `/api/auth/register`
* **Headers**: `Content-Type: application/json`
* **Request Body**:
  ```json
  {
    "username": "kushal",
    "password": "mypassword123"
  }
  ```
* **Success Response (`201 Created`)**:
  ```json
  {
    "success": true,
    "message": "User registered successfully",
    "user": {
      "id": 9431018,
      "username": "kushal"
    }
  }
  ```
* **Error Response (`400 Bad Request` or `409 Conflict`)**:
  ```json
  {
    "success": false,
    "message": "Username already exists"
  }
  ```

---

### 2. Login User
* **Method**: `POST`
* **URL**: `/api/auth/login`
* **Headers**: `Content-Type: application/json`
* **Request Body**:
  ```json
  {
    "username": "kushal",
    "password": "mypassword123"
  }
  ```
* **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "username": "kushal"
  }
  ```
* **Error Response (`401 Unauthorized`)**:
  ```json
  {
    "success": false,
    "message": "Invalid username or password"
  }
  ```

---

### 3. Search Roster Players
* **Method**: `GET`
* **URL**: `/api/players/search?q=Koh`
* **Headers**: 
  * `Authorization: Bearer <token>`
* **Query Parameters**:
  * `q` (string): Search query (matches case-insensitive substring of `name` or `username`).
* **Success Response (`200 OK`)**:
  ```json
  [
    {
      "id": 834920,
      "name": "Virat Kohli"
    },
    {
      "id": 142095,
      "name": "Jasprit Bumrah"
    }
  ]
  ```

---

### 4. Get Player Profile
* **Method**: `GET`
* **URL**: `/api/players/:name/profile` (e.g. `/api/players/Virat Kohli/profile`)
* **Headers**:
  * `Authorization: Bearer <token>`
* **Success Response (`200 OK`)**:
  ```json
  {
    "username": "virat_username",
    "name": "Virat Kohli",
    "avatarUrl": "https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?w=150",
    "role": "Top-order Batsman",
    "battingStyle": "Right-hand bat",
    "bowlingStyle": "Right-arm medium",
    "stats": {
      "batting": {
        "matches": 124,
        "innings": 118,
        "runs": 5412,
        "ballsFaced": 3820,
        "average": 49.2,
        "strikeRate": 141.67,
        "highestScore": "122*",
        "notOuts": 18,
        "fifties": 38,
        "hundreds": 6,
        "fours": 492,
        "sixes": 152
      },
      "bowling": {
        "matches": 124,
        "innings": 15,
        "wickets": 4,
        "runsConceded": 165,
        "ballsBowled": 120,
        "economy": 8.25,
        "average": 41.25,
        "strikeRate": 30.0,
        "bestBowling": "1/11",
        "threeWickets": 0,
        "fiveWickets": 0
      },
      "fielding": {
        "catches": 68,
        "stumpings": 0,
        "runOuts": 14
      }
    }
  }
  ```
* **Error Response (`404 Not Found`)**:
  ```json
  {
    "success": false,
    "message": "Player 'Virat Kohli' not found"
  }
  ```

---

### 5. Get Player Match History
* **Method**: `GET`
* **URL**: `/api/players/:name/matches` (e.g. `/api/players/Virat Kohli/matches`)
* **Headers**:
  * `Authorization: Bearer <token>`
* **Success Response (`200 OK`)**:
  ```json
  [
    {
      "matchId": 14,
      "date": "2026-06-24",
      "teamAName": "Team A",
      "teamBName": "Team B",
      "teamAScore": 85,
      "teamAWickets": 4,
      "teamBScore": 81,
      "teamBWickets": 6,
      "winner": "Team A",
      "playerOfTheMatch": "Virat Kohli",
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

---

### 6. Publish Match Results
* **Method**: `POST`
* **URL**: `/api/matches/publish`
* **Headers**:
  * `Authorization: Bearer <token>`
  * `Content-Type: application/json`
* **Request Body**:
  ```json
  {
    "matchId": 14,
    "date": "2026-06-24",
    "teamAName": "Team A",
    "teamBName": "Team B",
    "oversCount": 5,
    "playersPerTeam": 11,
    "winner": "Team A",
    "playerOfTheMatch": "Virat Kohli",
    "teamAScore": 85,
    "teamAWickets": 4,
    "teamABallsBowled": 30,
    "teamBScore": 81,
    "teamBWickets": 6,
    "teamBBallsBowled": 30,
    "innings": [
      {
        "inningsIndex": 0,
        "battingTeam": "Team A",
        "bowlingTeam": "Team B",
        "totalRuns": 85,
        "wickets": 4,
        "ballsBowled": 30,
        "extras": { "wide": 2, "noball": 1, "bye": 0, "legbye": 1, "total": 4 },
        "battingScorecard": [
          {
            "playerId": 1,
            "name": "Virat Kohli",
            "runs": 45,
            "ballsFaced": 20,
            "fours": 4,
            "sixes": 2,
            "isOut": true,
            "dismissalType": "caught",
            "dismissedBy": "Jasprit Bumrah"
          }
        ],
        "bowlingScorecard": [
          {
            "playerId": 2,
            "name": "Jasprit Bumrah",
            "ballsBowled": 12,
            "runsConceded": 15,
            "wickets": 2,
            "maidens": 0,
            "economy": 7.5
          }
        ]
      },
      {
        "inningsIndex": 1,
        "battingTeam": "Team B",
        "bowlingTeam": "Team A",
        "totalRuns": 81,
        "wickets": 6,
        "ballsBowled": 30,
        "extras": { "wide": 1, "noball": 0, "bye": 0, "legbye": 0, "total": 1 },
        "battingScorecard": [],
        "bowlingScorecard": []
      }
    ],
    "ballEvents": [
      {
        "inningsIndex": 0,
        "overNumber": 0,
        "ballNumber": 1,
        "batsmanName": "Virat Kohli",
        "bowlerName": "Jasprit Bumrah",
        "runs": 4,
        "isWicket": 0,
        "wicketType": "none",
        "fielderName": null,
        "extraRuns": 0,
        "extraType": "none"
      }
    ]
  }
  ```
* **Success Response (`201 Created`)**:
  ```json
  {
    "success": true,
    "message": "Match results published and career stats synchronized successfully",
    "matchId": 14
  }
  ```
* **⚠️ Unknown Player Behavior**:
  If a scorecard player name ends in `(unknown)` (e.g. `John(unknown)`), the backend:
  1. Validates and auto-creates a guest/player profile with `name = "John(unknown)"` and baseline career stats.
  2. Aggregates metrics into their guest career.
  3. Includes them on the daily performers lists, but excludes them from long-term aggregate leaderboards.

---

### 7. Get Match Details
* **Method**: `GET`
* **URL**: `/api/matches/:matchId` (e.g. `/api/matches/14`)
* **Headers**:
  * `Authorization: Bearer <token>`
* **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "summary": "Team A won by 4 runs",
    "topPerformers": {
      "batsman": {
        "name": "Virat Kohli",
        "runs": 45,
        "balls": 20,
        "strikeRate": 225
      },
      "bowler": {
        "name": "Jasprit Bumrah",
        "wickets": 2,
        "runsConceded": 15,
        "balls": 12
      }
    },
    "match": {
      "matchId": 14,
      "date": "2026-06-24",
      "teamAName": "Team A",
      "teamBName": "Team B",
      "oversCount": 5,
      "playersPerTeam": 11,
      "winner": "Team A",
      "playerOfTheMatch": "Virat Kohli",
      "teamAScore": 85,
      "teamAWickets": 4,
      "teamABallsBowled": 30,
      "teamBScore": 81,
      "teamBWickets": 6,
      "teamBBallsBowled": 30,
      "innings": [
        {
          "inningsIndex": 0,
          "battingTeam": "Team A",
          "bowlingTeam": "Team B",
          "totalRuns": 85,
          "wickets": 4,
          "ballsBowled": 30,
          "extras": { "wide": 2, "noball": 1, "bye": 0, "legbye": 1, "total": 4 },
          "battingScorecard": [
            {
              "name": "Virat Kohli",
              "runs": 45,
              "ballsFaced": 20,
              "fours": 4,
              "sixes": 2,
              "isOut": true,
              "dismissalType": "caught",
              "dismissedBy": "Jasprit Bumrah",
              "fielderName": "Siva",
              "dismissalSummary": "c Siva b Jasprit Bumrah"
            }
          ],
          "bowlingScorecard": [
            {
              "name": "Jasprit Bumrah",
              "ballsBowled": 12,
              "runsConceded": 15,
              "wickets": 2,
              "maidens": 0,
              "economy": 7.5
            }
          ]
        }
      ],
      "ballEvents": [...]
    }
  }
  ```

---

### 8. Undo Match Results
* **Method**: `DELETE`
* **URL**: `/api/matches/:matchId` (e.g. `/api/matches/14`)
* **Headers**:
  * `Authorization: Bearer <token>`
* **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "message": "Match results for Match ID 14 successfully undone and deleted."
  }
  ```
* **Error Response (`404 Not Found`)**:
  ```json
  {
    "success": false,
    "message": "Match not found"
  }
  ```

---

### 9. Get Stats Dashboard / Match Days
* **Method**: `GET`
* **URL**: `/api/stats/days`
* **Headers**:
  * `Authorization: Bearer <token>`
* **Success Response (`200 OK`)**:
  ```json
  [
    {
      "date": "2026-06-24",
      "matchesPlayed": 3
    },
    {
      "date": "2026-06-23",
      "matchesPlayed": 1
    }
  ]
  ```

---

### 10. Get Top Performers of the Day
* **Method**: `GET`
* **URL**: `/api/stats/performers?date=2026-06-24`
* **Headers**:
  * `Authorization: Bearer <token>`
* **Success Response (`200 OK`)**:
  ```json
  {
    "date": "2026-06-24",
    "topBatsmen": [
      { "name": "Virat Kohli", "runs": 122, "balls": 61, "strikeRate": 200.0 }
    ],
    "topBowlers": [
      { "name": "Jasprit Bumrah", "wickets": 4, "runsConceded": 12, "overs": 4.0 }
    ],
    "topDotBowlers": [
      { "name": "Jasprit Bumrah", "dotBalls": 16, "overs": 4.0 }
    ]
  }
  ```

---

### 11. Health Check
* **Method**: `GET`
* **URL**: `/api/health`
* **Success Response (`200 OK`)**:
  ```json
  {
    "status": "ok",
    "message": "Server is running smoothly"
  }
  ```
