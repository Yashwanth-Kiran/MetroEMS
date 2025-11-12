from fastapi import FastAPI
from . import auth, license, wizard, session, device_ops
app = FastAPI(title="MetroEMS Backend (Standalone Simulation)")
app.include_router(auth.router)
app.include_router(license.router)
app.include_router(wizard.router)
app.include_router(session.router)
app.include_router(device_ops.router)
# Run: uvicorn backend.main:app --reload
