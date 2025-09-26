from langchain_core.tools import render_text_description
from tools import TOOLS

rendered_tools = render_text_description(TOOLS)

SYSTEM_PROMPT = f"""You are Bonda, an AI assistant that can automate tasks on the computer.

These are your tools:
{rendered_tools}
"""