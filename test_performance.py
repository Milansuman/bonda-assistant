#!/usr/bin/env python3

"""
Test script to check actual performance and identify bottlenecks
"""

import time
import threading
from RealtimeSTT import AudioToTextRecorder

def test_performance():
    print("=== Performance Comparison ===")
    
    # Test CPU performance
    print("Testing CPU performance...")
    start_time = time.time()
    try:
        recorder_cpu = AudioToTextRecorder(
            model='tiny',
            device='cpu',
            compute_type='float32'
        )
        cpu_init_time = time.time() - start_time
        print(f"✓ CPU initialization: {cpu_init_time:.2f} seconds")
    except Exception as e:
        print(f"✗ CPU test failed: {e}")
        return
    
    # Test CUDA performance (will fallback to CPU if not available)
    print("Testing CUDA performance...")
    start_time = time.time()
    try:
        recorder_cuda = AudioToTextRecorder(
            model='tiny',
            device='cuda',
            gpu_device_index=0,
            compute_type='float32'
        )
        cuda_init_time = time.time() - start_time
        print(f"✓ CUDA initialization: {cuda_init_time:.2f} seconds")
        
        # Check if it's actually using GPU
        print(f"Device being used: {getattr(recorder_cuda, 'device', 'unknown')}")
        
    except Exception as e:
        print(f"✗ CUDA test failed: {e}")
        return
    
    print(f"\nPerformance comparison:")
    print(f"CPU init time: {cpu_init_time:.2f}s")
    print(f"CUDA init time: {cuda_init_time:.2f}s")
    
    if cuda_init_time < cpu_init_time:
        print("✓ CUDA appears to be working (faster initialization)")
    else:
        print("⚠ CUDA might not be working (similar or slower than CPU)")

def check_alternatives():
    print("\n=== Alternative Solutions ===")
    print("Since your NVIDIA driver is v457.49 (CUDA 11.1), here are options:")
    print("1. Update NVIDIA driver to latest version (supports CUDA 12+)")
    print("2. Use CPU with optimizations (often good enough for real-time STT)")
    print("3. Use different model sizes (tiny vs base vs large)")
    print("4. Optimize other parts of the pipeline")
    
def suggest_optimizations():
    print("\n=== CPU Optimization Suggestions ===")
    print("Since GPU isn't working, let's optimize CPU performance:")
    print("1. Use 'tiny' model for fastest inference")
    print("2. Use 'int8' compute_type for lower memory usage")
    print("3. Reduce batch_size to 1 for real-time processing")
    print("4. Use shorter audio chunks")

if __name__ == "__main__":
    test_performance()
    check_alternatives()
    suggest_optimizations()