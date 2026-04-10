"""
FLO.W - Messages router

Local-only secure journal / messaging endpoints wrapping
services.messages_store. Since the backend binds to 127.0.0.1,
no authentication layer is required beyond the optional PIN used
to obfuscate encrypted bodies.
"""
from typing import List, Optional

from fastapi import APIRouter, Query
from pydantic import BaseModel

from services import messages_store

router = APIRouter()


class CreateMessageBody(BaseModel):
    channel: str = "journal"
    title: str = ""
    body: str = ""
    tags: Optional[List[str]] = None
    important: bool = False
    encrypt: bool = False
    pin: Optional[str] = None


class UpdateMessageBody(BaseModel):
    pinned: Optional[bool] = None
    important: Optional[bool] = None
    tags: Optional[List[str]] = None
    title: Optional[str] = None
    body: Optional[str] = None


class LockBody(BaseModel):
    locked: bool


@router.get("")
def list_all(
    channel: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    pin: Optional[str] = Query(None),
):
    return messages_store.list_messages(channel=channel, search=search, pin=pin)


@router.post("")
def create(body: CreateMessageBody):
    return messages_store.create_message(
        channel=body.channel,
        title=body.title,
        body=body.body,
        tags=body.tags,
        important=body.important,
        encrypt=body.encrypt,
        pin=body.pin,
    )


@router.patch("/{message_id}")
def update(message_id: str, body: UpdateMessageBody):
    return messages_store.update_message(
        message_id=message_id,
        pinned=body.pinned,
        important=body.important,
        tags=body.tags,
        title=body.title,
        body=body.body,
    )


@router.delete("/{message_id}")
def delete(message_id: str):
    return messages_store.delete_message(message_id)


@router.post("/lock")
def lock(body: LockBody):
    return messages_store.set_lock(body.locked)
