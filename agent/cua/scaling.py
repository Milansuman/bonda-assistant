import platform
import ctypes
import pyautogui

def get_scaling_factor_windows(x=0, y=0):
    user32 = ctypes.windll.user32
    monitor = user32.MonitorFromPoint((x, y), 2)
    dpiX = ctypes.c_uint()
    dpiY = ctypes.c_uint()
    shcore = ctypes.windll.shcore
    result = shcore.GetDpiForMonitor(monitor, 0, ctypes.byref(dpiX), ctypes.byref(dpiY))
    if result == 0:
        return dpiX.value / 96.0
    else:
        return 1.0

def get_scaling_factor_macos():
    from AppKit import NSScreen
    screens = NSScreen.screens()
    if screens:
        return screens[0].backingScaleFactor()
    return 1.0

def get_scaling_factor_linux():
    return 1.25

def get_scaling_factor(x=0, y=0):
    system = platform.system()
    if system == "Windows":
        return get_scaling_factor_windows(x, y)
    elif system == "Darwin":
        return get_scaling_factor_macos()
    else:
        return get_scaling_factor_linux()