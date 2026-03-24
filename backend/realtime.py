import anyio
from fastapi import WebSocket
from typing import Any, Dict, Optional, Set


class ConnectionManager:
    def __init__(self) -> None:
        self._connections_all: Set[WebSocket] = set()
        self._connections_by_user: Dict[int, Set[WebSocket]] = {}
        self._connections_admin: Set[WebSocket] = set()

    async def connect(self, ws: WebSocket, *, user_id: int, is_admin: bool) -> None:
        await ws.accept()
        self._connections_all.add(ws)
        self._connections_by_user.setdefault(user_id, set()).add(ws)
        if is_admin:
            self._connections_admin.add(ws)

    def disconnect(self, ws: WebSocket) -> None:
        self._connections_all.discard(ws)
        self._connections_admin.discard(ws)
        for user_id, conns in list(self._connections_by_user.items()):
            conns.discard(ws)
            if not conns:
                self._connections_by_user.pop(user_id, None)

    async def emit(
        self,
        payload: Dict[str, Any],
        *,
        user_id: Optional[int] = None,
        admin_only: bool = False,
    ) -> None:
        targets: Set[WebSocket]
        if admin_only:
            targets = set(self._connections_admin)
        elif user_id is not None:
            targets = set(self._connections_by_user.get(user_id, set())) | set(self._connections_admin)
        else:
            targets = set(self._connections_all)

        dead: Set[WebSocket] = set()
        for ws in targets:
            try:
                await ws.send_json(payload)
            except Exception:
                dead.add(ws)

        for ws in dead:
            self.disconnect(ws)


manager = ConnectionManager()


def emit_from_sync(
    payload: Dict[str, Any],
    *,
    user_id: Optional[int] = None,
    admin_only: bool = False,
) -> None:
    try:
        anyio.from_thread.run(manager.emit, payload, user_id=user_id, admin_only=admin_only)
    except Exception:
        # Best-effort: realtime failures shouldn't break core API paths
        return

