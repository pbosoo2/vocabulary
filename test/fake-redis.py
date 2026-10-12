# Local test-only Redis REST adapter. No production keys or connections.
import json, threading
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
import fakeredis
client=fakeredis.FakeRedis(decode_responses=True)
lock=threading.Lock()
class Handler(BaseHTTPRequestHandler):
 def log_message(self,*args):pass
 def do_POST(self):
  commands=json.loads(self.rfile.read(int(self.headers['Content-Length'])))
  batch=self.path in ('/pipeline','/multi-exec')
  if not batch:commands=[commands]
  out=[]
  with lock:
   for args in commands:
    try:out.append({'result':client.execute_command(*args)})
    except Exception as e:out.append({'error':str(e)})
  data=json.dumps(out if batch else out[0],default=lambda x:list(x) if isinstance(x,set) else x.decode() if isinstance(x,bytes) else str(x)).encode()
  self.send_response(200);self.send_header('Content-Type','application/json');self.end_headers();self.wfile.write(data)
s=ThreadingHTTPServer(('127.0.0.1',0),Handler)
print(s.server_address[1],flush=True);s.serve_forever()
