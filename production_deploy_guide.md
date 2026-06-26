# Production Deployment Guide: deploying to https://Dynaviz.com

This guide provides the exact steps needed to move your local application from `127.0.0.1:8000` to a public production server hosted at `https://Dynaviz.com`.

---

## Step 1: Purchase the Domain and Point DNS Records
1. Purchase the domain **`Dynaviz.com`** from any domain registrar (e.g., Namecheap, GoDaddy, Cloudflare, etc.).
2. Go to your registrar's DNS Management console and add the following records:
   - **Type A Record**: Name: `@`, Value: `[Your Remote Server's Public IP Address]`
   - **Type A Record**: Name: `www`, Value: `[Your Remote Server's Public IP Address]`
3. Wait for DNS propagation (usually takes 5 to 30 minutes).

---

## Step 2: Set Up the Remote Linux Server (Ubuntu VPS)
Connect to your remote Linux server via SSH:
```bash
ssh user@your_server_ip
```
Update and install necessary server utilities:
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install python3-pip python3-venv git nginx -y
```

---

## Step 3: Clone and Prepare your Application
1. Clone your project code onto the remote server:
   ```bash
   git clone <your-repository-url> /var/www/dynaviz
   cd /var/www/dynaviz
   ```
2. Create and activate a python virtual environment:
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   ```
3. Install the project dependencies:
   ```bash
   pip install -r requirements.txt
   ```

---

## Step 4: Run Uvicorn as a Background Service (Systemd)
To ensure your python API continues to run even if you log out of the server, configure it as a background service:

1. Create a service file:
   ```bash
   sudo nano /etc/systemd/system/dynaviz.service
   ```
2. Paste the following configuration:
   ```ini
   [Unit]
   Description=DynaViz FastAPI Application Backend
   After=network.target

   [Service]
   User=www-data
   WorkingDirectory=/var/www/dynaviz
   Environment="ALLOWED_ORIGINS=https://Dynaviz.com,https://www.Dynaviz.com"
   ExecStart=/var/www/dynaviz/.venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000
   Restart=always

   [Install]
   WantedBy=multi-user.target
   ```
3. Start and enable the service:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl start dynaviz
   sudo systemctl enable dynaviz
   ```

---

## Step 5: Configure Nginx as the Reverse Proxy
Use the Nginx configuration template created in your workspace to route traffic from ports 80/443 to your backend service.

1. Copy and create the Nginx site config file:
   ```bash
   sudo nano /etc/nginx/sites-available/dynaviz
   ```
2. Paste the configuration below (updated for `Dynaviz.com`):
   ```nginx
   server {
       listen 80;
       listen [::]:80;
       server_name Dynaviz.com www.Dynaviz.com;

       # Redirect all HTTP requests to HTTPS
       return 301 https://$host$request_uri;
   }

   server {
       listen 443 ssl http2;
       listen [::]:443 ssl http2;
       server_name Dynaviz.com www.Dynaviz.com;

       # SSL Certificates (provisioned automatically by Certbot in the next step)
       ssl_certificate /etc/letsencrypt/live/Dynaviz.com/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/Dynaviz.com/privkey.pem;
       
       ssl_session_timeout 1d;
       ssl_session_cache shared:MozSSL:10m;
       ssl_session_tickets off;

       ssl_protocols TLSv1.2 TLSv1.3;
       ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
       ssl_prefer_server_ciphers off;

       location / {
           proxy_pass http://127.0.0.1:8000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
       }
   }
   ```
3. Enable the configuration and restart Nginx:
   ```bash
   sudo ln -s /etc/nginx/sites-available/dynaviz /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

---

## Step 6: Acquire Let's Encrypt SSL Certificates (HTTPS)
Use Certbot to secure your traffic and automatically generate the SSL certificates configured above:

1. Install Certbot:
   ```bash
   sudo apt install certbot python3-certbot-nginx -y
   ```
2. Request the certificate:
   ```bash
   sudo certbot --nginx -d Dynaviz.com -d www.Dynaviz.com
   ```
3. Follow the interactive prompts. Once completed, Certbot will automatically install the certificate paths into your Nginx configuration, verify the setup, and reload Nginx.

Your sandbox will now be live and securely served at **`https://Dynaviz.com`**!
