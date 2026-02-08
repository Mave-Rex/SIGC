import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API_BASE = "http://localhost:8000";

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100vw",
        maxWidth: "100vw",
        overflowX: "hidden",
        background:
          "radial-gradient(900px 500px at 12% 12%, rgba(45,106,106,.20), transparent 60%)," +
          "radial-gradient(700px 380px at 85% 16%, rgba(31,58,90,.18), transparent 60%)," +
          "linear-gradient(180deg, var(--bg1), var(--bg2))",
        padding: 26,
      }}
      >
      <style>{css}</style>

      <header className="header">
        <div>
          <h1 className="title">SIGC — New</h1>
          <p className="subtitle ">Small Description</p>
        </div>
        
      <div className="form-header">

       <div className="headerRight">
          <button
            onClick={() => navigate("/registro")}
            style={{
              background: "linear-gradient(135deg, #218849, #16a34a)",
              color: "#fff",
              border: "none",
              padding: "10px 20px",
              borderRadius: "10px",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
              transition: "all 0.25s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 6px 14px rgba(0,0,0,0.2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 4px 10px rgba(0,0,0,0.15)";
            }}
          >
            Realizar un Registro
          </button>

        </div>
      </div>

      </header>
    </div>
  );
}

const css = `
  :root{
    --bg1:#f2f7f6;
    --bg2:#e9f1ef;
    --card:#ffffffcc;
    --stroke:#d7e6e2;
    --text:#0f172a;
    --muted:#334155;
    --pill:#0b1220;
    --pillText:#e5e7eb;

    /* paleta pastel basada en tu referencia (verdes/azules suaves) */
    --a:#2d6a6a;
    --a2:#3a7f7f;
    --b:#1f3a5a;
    --shadow: 0 18px 40px rgba(15, 23, 42, .10);
    --shadow2: 0 10px 25px rgba(15, 23, 42, .10);
    --r:18px;
  }

  *{ box-sizing:border-box; }
  body{ margin:0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; color:var(--text); }

  .header{
    display:flex;
    justify-content:space-between;
    align-items:flex-end;
    gap:16px;
    padding: 22px 22px 14px 22px;
    border: 1px solid var(--stroke);
    border-radius: var(--r);
    background: var(--card);
    box-shadow: var(--shadow);
    backdrop-filter: blur(10px);
  }
  .title{
    margin:0;
    font-size: 44px;
    letter-spacing: .2px;
    color: var(--b);
  }
  .subtitle{
    margin:6px 0 0 0;
    color: var(--muted);
    font-size: 14px;
  }
  .headerRight{
    display:flex;
    gap:10px;
    align-items:center;
    flex-wrap:wrap;
    padding-bottom: 4px;
  }
`;
