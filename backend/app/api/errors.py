"""Shared API error contract.

- 404 and 409 bodies are `ErrorResponse` (`{"detail": "<message>"}`); declare them on routes
  with `responses={**NOT_FOUND, **CONFLICT}` so they appear in OpenAPI.
- Every 422 uses FastAPI's standard validation shape (`{"detail": [{loc, msg, type, ...}]}`),
  including domain checks done in services: raise `validation_error(...)` for those.
"""

from collections.abc import Sequence
from typing import Any

from fastapi import HTTPException
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel

Responses = dict[int | str, dict[str, Any]]


class ErrorResponse(BaseModel):
    detail: str


NOT_FOUND: Responses = {404: {"model": ErrorResponse, "description": "Not found"}}
CONFLICT: Responses = {409: {"model": ErrorResponse, "description": "Conflict"}}


def http_error(status_code: int, detail: str) -> HTTPException:
    """An error whose body matches `ErrorResponse`."""
    return HTTPException(status_code=status_code, detail=detail)


def validation_error(
    loc: Sequence[str | int], msg: str, input_value: object = None
) -> RequestValidationError:
    """A 422 in the same shape FastAPI uses for request validation failures."""
    return RequestValidationError(
        [{"type": "value_error", "loc": tuple(loc), "msg": msg, "input": input_value}]
    )
