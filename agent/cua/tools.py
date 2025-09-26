from langchain_core.tools import tool

@tool
def click(x: int, y: int):
    """Click tool"""

@tool
def typeText(text: str):
    """Type text tool"""


tools = [click, typeText]