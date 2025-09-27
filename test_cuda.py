#!/usr/bin/env python3
"""
Test script to check CUDA availability for RealtimeSTT
"""

import sys
import traceback

def test_pytorch():
    """Test PyTorch CUDA support"""
    try:
        import torch
        print(f"✓ PyTorch version: {torch.__version__}")
        print(f"✓ CUDA available in PyTorch: {torch.cuda.is_available()}")
        if torch.cuda.is_available():
            print(f"✓ CUDA device count: {torch.cuda.device_count()}")
            print(f"✓ CUDA device name: {torch.cuda.get_device_name(0)}")
            print(f"✓ CUDA capability: {torch.cuda.get_device_capability(0)}")
        else:
            print("⚠ PyTorch CUDA not available")
        return torch.cuda.is_available()
    except Exception as e:
        print(f"❌ Error testing PyTorch: {e}")
        return False

def test_ctranslate2():
    """Test CTranslate2 CUDA support"""
    try:
        import ctranslate2
        print(f"✓ CTranslate2 version: {ctranslate2.__version__}")
        
        # Check available devices
        devices = ctranslate2.get_supported_compute_types("cuda")
        print(f"✓ CTranslate2 CUDA compute types: {devices}")
        
        # Try to create a CUDA device
        try:
            device_index = ctranslate2.get_cuda_device_count()
            print(f"✓ CTranslate2 CUDA device count: {device_index}")
            return device_index > 0
        except Exception as e:
            print(f"⚠ CTranslate2 CUDA device check failed: {e}")
            return False
            
    except Exception as e:
        print(f"❌ Error testing CTranslate2: {e}")
        return False

def test_realtime_stt():
    """Test RealtimeSTT with CUDA configuration"""
    try:
        from RealtimeSTT import AudioToTextRecorder
        
        print("\n🔧 Testing RealtimeSTT CUDA configuration...")
        
        # Test CUDA configuration
        print("Attempting to create recorder with CUDA...")
        recorder = AudioToTextRecorder(
            model='tiny',
            device='cuda',
            gpu_device_index=0,
            compute_type='int8'  # More compatible compute type
        )
        
        # Check what device is actually being used
        # This is a bit hacky but let's see if we can introspect
        if hasattr(recorder, 'model'):
            print(f"✓ RealtimeSTT recorder created successfully")
            print(f"✓ Model loaded: {recorder.model}")
            
            # Try to get device info from the internal model
            if hasattr(recorder.model, 'device'):
                print(f"✓ Model device: {recorder.model.device}")
            
        return True
        
    except Exception as e:
        print(f"❌ Error testing RealtimeSTT: {e}")
        traceback.print_exc()
        return False

def test_nvidia_driver():
    """Test NVIDIA driver"""
    try:
        import subprocess
        result = subprocess.run(['nvidia-smi', '--query-gpu=name,driver_version,memory.total', '--format=csv,noheader,nounits'], 
                              capture_output=True, text=True, timeout=10)
        if result.returncode == 0:
            gpu_info = result.stdout.strip().split(', ')
            print(f"✓ GPU: {gpu_info[0]}")
            print(f"✓ Driver: {gpu_info[1]}")
            print(f"✓ Memory: {gpu_info[2]} MB")
            return True
        else:
            print("❌ nvidia-smi failed")
            return False
    except Exception as e:
        print(f"❌ Error checking NVIDIA driver: {e}")
        return False

if __name__ == "__main__":
    print("🚀 CUDA Compatibility Test for RealtimeSTT")
    print("=" * 50)
    
    # Test NVIDIA driver
    print("\n1. Testing NVIDIA Driver...")
    nvidia_ok = test_nvidia_driver()
    
    # Test PyTorch
    print("\n2. Testing PyTorch...")
    pytorch_cuda = test_pytorch()
    
    # Test CTranslate2
    print("\n3. Testing CTranslate2...")
    ct2_cuda = test_ctranslate2()
    
    # Test RealtimeSTT
    print("\n4. Testing RealtimeSTT...")
    stt_ok = test_realtime_stt()
    
    # Summary
    print("\n" + "=" * 50)
    print("📋 SUMMARY:")
    print(f"NVIDIA Driver: {'✓' if nvidia_ok else '❌'}")
    print(f"PyTorch CUDA: {'✓' if pytorch_cuda else '❌'}")
    print(f"CTranslate2 CUDA: {'✓' if ct2_cuda else '❌'}")
    print(f"RealtimeSTT: {'✓' if stt_ok else '❌'}")
    
    if stt_ok:
        print("\n🎉 RealtimeSTT should work with GPU acceleration!")
    elif ct2_cuda:
        print("\n⚠ CTranslate2 supports CUDA but RealtimeSTT failed to initialize")
        print("💡 Try updating RealtimeSTT or check model compatibility")
    else:
        print("\n❌ CUDA support not available for RealtimeSTT")
        print("💡 Consider updating NVIDIA drivers or installing CUDA toolkit")