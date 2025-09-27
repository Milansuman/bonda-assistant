import os
import time
import subprocess
import tempfile
from langchain_openai import ChatOpenAI
import pyautogui
import base64
from io import BytesIO
from PIL import Image
from langchain_core.tools import tool
from enum import Enum
from typing import Any, Dict, Optional, TypedDict
from langchain_core.runnables import RunnableConfig
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from instructions import GROUNDING_PROMPT
from scaling import get_scaling_factor

ACTION_DELAY = 0.1

def is_wayland():
    """Check if the system is running Wayland."""
    return os.environ.get('WAYLAND_DISPLAY') is not None or os.environ.get('XDG_SESSION_TYPE') == 'wayland'

def take_screenshot_wayland():
    """Take a screenshot on Wayland using available tools."""
    # Try different screenshot tools in order of preference
    screenshot_tools = [
        ['grim', '-'],  # Outputs to stdout
        ['gnome-screenshot', '-f', '/dev/stdout'],  # GNOME screenshot tool
        ['spectacle', '-b', '-o', '/dev/stdout'],  # KDE screenshot tool
        ['wayshot', '--stdout'],  # Another Wayland screenshot tool
    ]
    
    for tool_cmd in screenshot_tools:
        try:
            # Check if the tool exists
            subprocess.run(['which', tool_cmd[0]], check=True, capture_output=True)
            
            # Run the screenshot command
            result = subprocess.run(tool_cmd, capture_output=True, check=True)
            
            # Load the image from bytes
            image = Image.open(BytesIO(result.stdout))
            print(f"Screenshot taken using {tool_cmd[0]}")
            return image
            
        except (subprocess.CalledProcessError, FileNotFoundError):
            continue
    
    raise RuntimeError("No suitable screenshot tool found for Wayland. Please install grim, gnome-screenshot, spectacle, or wayshot.")

def take_screenshot_x11():
    """Take a screenshot using PyAutoGUI for X11."""
    return pyautogui.screenshot()

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
def fetch_screen():
    """Get the current page screenshot.
    
    """
    try:
        # Choose screenshot method based on display server
        if is_wayland():
            screenshot = take_screenshot_wayland()
        else:
            screenshot = take_screenshot_x11()
        
        # Ensure screenshot is in RGB mode
        if screenshot.mode in ("RGBA", "LA") or screenshot.mode == "P":
            screenshot = screenshot.convert("RGB")
        
        # Convert to base64
        buffer = BytesIO()
        screenshot.save(buffer, format="JPEG", quality=40, optimize=True)
        img_bytes = buffer.getvalue()
        img_base64 = base64.b64encode(img_bytes).decode('utf-8')
        print("Screen fetched successfully")
        
        return { "type": "screen", "data": img_base64, "text": "Screen fetched successfully" }
        
    except Exception as e:
        error_msg = f"Failed to take screenshot: {str(e)}"
        print(error_msg)
        return { "type": "error", "text": error_msg }

@tool
def get_coordinates(description: str):
    """Get the coordinates of the specified element. ALWAYS fetch the screen before calling this tool.
    
    Args:
        description: A brief description about the element to locate. Also pass your intention, like 'I want to click on it'.
    
    """
    try:
        grounding_model = ChatOpenAI(
            model="qwen/qwen2.5-vl-72b-instruct",
            # model="bytedance/ui-tars-1.5-7b",
            api_key=os.environ["OPENROUTER_API_KEY"],
            base_url="https://openrouter.ai/api/v1",
            extra_body={
                "provider": {"only": ["hyperbolic"]}
            }
        )
        messages = [SystemMessage(content=GROUNDING_PROMPT)]

        # Use the same screenshot method as fetch_screen
        if is_wayland():
            screenshot = take_screenshot_wayland()
        else:
            screenshot = take_screenshot_x11()
        
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
        
    except Exception as e:
        error_msg = f"Failed to get coordinates: {str(e)}"
        print(error_msg)
        return { "type": "error", "text": error_msg }

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
def clearValue(x: int, y: int):
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

@tool
def message(text: str):
    """Print a message.
    
    Args:
        text: The message to print.
    
    """
    return { "type": "text", "text": "Message printed successfully" }

TOOLS = [
    fetch_screen,
    get_coordinates,
    click,
    type_text,
    clearValue,
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