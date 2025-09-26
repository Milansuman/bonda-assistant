import time
import pyautogui
import base64
from io import BytesIO
from langchain_core.tools import tool
from enum import Enum
from typing import Any, Dict, Optional, TypedDict
from langchain_core.runnables import RunnableConfig

ACTION_DELAY = 0.1

def move_mouse_to(x: int, y: int):
    pyautogui.moveTo(x, y)
    time.sleep(ACTION_DELAY)

class KEYS(str, Enum):
    Enter = "Enter"
    Backspace = "Backspace"
    Delete = "Delete"
    Tab = "Tab"
    Escape = "Escape"
    Space = "Space"
    ArrowUp = "ArrowUp"
    ArrowDown = "ArrowDown"
    ArrowLeft = "ArrowLeft"
    ArrowRight = "ArrowRight"
    PageUp = "PageUp"
    PageDown = "PageDown"

@tool
def fetchScreen():
    """Get the current page screenshot.
    
    """
    screenshot = pyautogui.screenshot()
    buffer = BytesIO()
    screenshot.save(buffer, format="PNG")
    img_bytes = buffer.getvalue()
    img_base64 = base64.b64encode(img_bytes).decode('utf-8')
    print("Screen fetched")
    return { "type:": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{img_base64}" } }

@tool
def click(x: int, y: int):
    """Simulate a click on the specified x and y coordinates.
    
    Args:
        x: The x coordinate of the click point.
        y: The y coordinate of the click point.
    
    """
    move_mouse_to(x, y)
    pyautogui.click()
    time.sleep(ACTION_DELAY)
    return { "type": "text", "text": "Clicked successfully" }

@tool
def typeText(x: int, y: int, text: str):
    """Type text into the specified field. Located by its x and y coordinates.
    
    Args:
        x: The x coordinate of the click point.
        y: The y coordinate of the click point.
        text: The text to type.
    
    """
    move_mouse_to(x, y)
    pyautogui.click()
    time.sleep(ACTION_DELAY)
    pyautogui.typewrite(text, interval=0.05)
    time.sleep(ACTION_DELAY)
    return { "type": "text", "text": "Text typed successfully" }

@tool
def clearValue(x: int, y: int):
    """Clears the value in the specified input field. Located by its x and y coordinates.
    
    Args:
        x: The x coordinate of the click point.
        y: The y coordinate of the click point.
    
    """
    move_mouse_to(x, y)
    pyautogui.click()
    time.sleep(ACTION_DELAY)
    pyautogui.hotkey('ctrl', 'a')
    time.sleep(ACTION_DELAY)
    pyautogui.press('backspace')
    time.sleep(ACTION_DELAY)
    return { "type": "text", "text": "Value cleared successfully" }

@tool
def keyPress(key: KEYS):
    """Send key press to the page.
    
    Args:
        key: The key to press.
    
    """
    pyautogui.press(key)
    time.sleep(ACTION_DELAY)
    return { "type": "text", "text": "Key pressed successfully" }

@tool
def scroll(x: int, y: int, xDistance: int, yDistance: int):
    """Scrolls the portion of the page specified by the x and y coordinates.
    
    Args:
        x: The x coordinate of the portion to scroll.
        y: The y coordinate of the portion to scroll.
        xDistance: The distance to scroll along the X axis (pixels).
        yDistance: The distance to scroll along the Y axis (pixels).
    
    """
    move_mouse_to(x, y)
    # pyautogui.scroll(amount_to_scroll, x=None, y=None)
    # This scrolls vertically. For horizontal scroll, pyautogui.hscroll() is used.
    if yDistance != 0:
        pyautogui.scroll(yDistance)  # Positive yDistance scrolls up, negative scrolls down
        time.sleep(ACTION_DELAY)
    if xDistance != 0:
        pyautogui.hscroll(xDistance)  # Positive xDistance scrolls right, negative scrolls left
        time.sleep(ACTION_DELAY)
    return { "type": "text", "text": "Scrolled successfully" }

@tool
def wait(ms: int):
    """Wait for a specified amount of time.
    
    Args:
        ms: The amount of time to wait in milliseconds.
    
    """
    time.sleep(ms / 1000)
    return { "type": "text", "text": "Waited successfully" }

@tool
def finish(message: str):
    """Mark the task as finished. No further actions will be taken.
    
    Args:
        message: The message to print.
    
    """

@tool
def error(message: str):
    """Mark the task as failed. No further actions will be taken.
    
    Args:
        message: The message to print.
    
    """

@tool
def message(text: str):
    """Print a message.
    
    Args:
        text: The message to print.
    
    """
    return { "type": "text", "text": "Message printed successfully" }

TOOLS = [
    fetchScreen,
    click,
    typeText,
    clearValue,
    keyPress,
    scroll,
    wait,
    finish,
    error,
    message
]

class ToolCallRequest(TypedDict):
    """A typed dict that shows the inputs into the invoke_tool function."""
    name: str
    arguments: Dict[str, Any]


def invoke_tool(
    tool_call_request: ToolCallRequest, config: Optional[RunnableConfig] = None
):
    """A function that we can use the perform a tool invocation.

    Args:
        tool_call_request: a dict that contains the keys name and arguments.
            The name must match the name of a tool that exists.
            The arguments are the arguments to that tool.
        config: This is configuration information that LangChain uses that contains
            things like callbacks, metadata, etc.See LCEL documentation about RunnableConfig.

    Returns:
        output from the requested tool
    """
    tool_name_to_tool = {tool.name: tool for tool in TOOLS}
    name = tool_call_request["name"]
    requested_tool = tool_name_to_tool[name]
    return requested_tool.invoke(tool_call_request["arguments"], config=config)