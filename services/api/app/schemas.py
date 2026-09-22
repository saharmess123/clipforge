from pydantic import BaseModel, Field


class ClipUpdate(BaseModel):
    start_seconds: float = Field(ge=0)
    end_seconds: float = Field(gt=0)