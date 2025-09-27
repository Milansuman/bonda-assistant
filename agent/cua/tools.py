import os
import time
from langchain_openai import ChatOpenAI
import pyautogui
import base64
from io import BytesIO
from langchain_core.tools import tool
from enum import Enum
from typing import Any, Dict, Optional, TypedDict
from langchain_core.runnables import RunnableConfig
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from instructions import GROUNDING_PROMPT
from scaling import get_scaling_factor

ACTION_DELAY = 0.1

def move_mouse_to(x: int, y: int):
    scaling_factor = get_scaling_factor(x, y)
    corrected_x = x / scaling_factor
    corrected_y = y / scaling_factor
    pyautogui.moveTo(corrected_x, corrected_y)
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
def capture_screen():
    """Get the current desktop screenshot.
    
    """
    screenshot = pyautogui.screenshot()
    if screenshot.mode in ("RGBA", "LA") or screenshot.mode == "P":
        screenshot = screenshot.convert("RGB")
    buffer = BytesIO()
    screenshot.save(buffer, format="JPEG", quality=40, optimize=True)
    img_bytes = buffer.getvalue()
    img_base64 = base64.b64encode(img_bytes).decode('utf-8')
    print("Screen fetched")
    # return { "type:": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{img_base64}" } }
    # return {
    #     "type": "image",
    #     "source_type": "base64",
    #     "mime_type": "image/jpeg",
    #     "data": img_base64
    # }
    return { "type": "screen", "data": img_base64, "text": "Screen fetched successfully" }

@tool
def get_coordinates(description: str):
    """Get the coordinates of the specified element. ALWAYS capture the screen before calling this tool.
    
    Args:
        description: A brief description about the element to locate.
    
    """
    grounding_model = ChatOpenAI(
        model="qwen/qwen2.5-vl-72b-instruct",
        temperature=0.3,
        # model="bytedance/ui-tars-1.5-7b",
        api_key=os.environ["OPENROUTER_API_KEY"],
        base_url="https://openrouter.ai/api/v1",
        extra_body={
            "provider": {"only": ["hyperbolic"]}
        }
    )
    messages = [SystemMessage(content=GROUNDING_PROMPT)]

    screenshot = pyautogui.screenshot()
    if screenshot.mode in ("RGBA", "LA") or screenshot.mode == "P":
        screenshot = screenshot.convert("RGB")
    buffer = BytesIO()
    screenshot.save(buffer, format="JPEG", quality=40, optimize=True)
    img_bytes = buffer.getvalue()
    img_base64 = base64.b64encode(img_bytes).decode('utf-8')

    messages.append(HumanMessage(
        content=[
            {
                "type": "text",
                "text": description
            },
            {
                "type": "image",
                "source_type": "base64",
                "mime_type": "image/jpeg",
                "data": img_base64
            }
        ]
    ))
    result = grounding_model.invoke(messages)
    print("Grounding result: ", result)
    return { "type": "text", "text": f"{result.content}" }

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
def type_text(x: int, y: int, text: str):
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
def clear_value(x: int, y: int):
    """Clears the value in the specified input field. Located by its x and y coordinates.
    
    Args:
        x: The x coordinate of the click point.
        y: The y coordinate of the click point.
    
    """
    move_mouse_to(x, y)
    pyautogui.click()
    time.sleep(ACTION_DELAY)
    if os.name == "posix":
        pyautogui.hotkey('command', 'a')
    else:
        pyautogui.hotkey('ctrl', 'a')
    time.sleep(ACTION_DELAY)
    pyautogui.press('backspace')
    time.sleep(ACTION_DELAY)
    return { "type": "text", "text": "Value cleared successfully" }

@tool
def key_press(key: KEYS):
    """Send key press to the page.
    
    Args:
        key: The key to press.
    
    """
    pyautogui.keyDown(key.value)
    pyautogui.keyUp(key.value)
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

TOOLS = [
    capture_screen,
    get_coordinates,
    click,
    type_text,
    clear_value,
    key_press,
    scroll,
    wait
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