import os
import re

with open("payroll-app.jsx", "r", encoding="utf-8") as f:
    content = f.read()

def get_func(func_name):
    idx = content.find(f"function {func_name}(")
    if idx == -1: return ""
    brace_count = 0
    in_brace = False
    for i in range(idx, len(content)):
        if content[i] == '{':
            brace_count += 1
            in_brace = True
        elif content[i] == '}':
            brace_count -= 1
        
        if in_brace and brace_count == 0:
            return content[idx:i+1]
    return ""

with open("src/components/Tables.jsx", "a", encoding="utf-8") as f:
    for fn in ["PeelerTable", "TempWorkerRow", "WorkersTab", "MobileEditModal"]:
        f.write("export " + get_func(fn) + "\n\n")

print("Appended missing components.")
