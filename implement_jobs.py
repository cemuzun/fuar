import re

with open('server.ts', 'r') as f:
    content = f.read()

# I need to implement a full background worker in server.ts that iterates through shows and calls the AI extraction function.
