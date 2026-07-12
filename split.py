import os
import re

with open("payroll-app.jsx", "r", encoding="utf-8") as f:
    content = f.read()

def get_block(start_marker, end_marker=None):
    if end_marker:
        idx1 = content.find(start_marker)
        idx2 = content.find(end_marker, idx1)
        if idx1 != -1 and idx2 != -1:
            return content[idx1:idx2]
    return ""

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

def get_const(const_name):
    idx = content.find(f"const {const_name} =")
    if idx == -1: return ""
    brace_count = 0
    in_brace = False
    open_char, close_char = '{', '}'
    first_brace = content.find('{', idx, idx+50)
    first_bracket = content.find('[', idx, idx+50)
    if first_bracket != -1 and (first_brace == -1 or first_bracket < first_brace):
        open_char, close_char = '[', ']'
    
    for i in range(idx, len(content)):
        if content[i] == open_char:
            brace_count += 1
            in_brace = True
        elif content[i] == close_char:
            brace_count -= 1
            
        if in_brace and brace_count == 0:
            semi = content.find(';', i)
            return content[idx:semi+1 if semi != -1 and semi - i < 5 else i+1]
    return ""

# EXTRACT FILES
os.makedirs("src/utils", exist_ok=True)
os.makedirs("src/components", exist_ok=True)
os.makedirs("src/components/tabs", exist_ok=True)
os.makedirs("src/store", exist_ok=True)

st_block = get_const("ST")
with open("src/utils/styles.js", "w", encoding="utf-8") as f:
    f.write("export " + st_block + "\n")

calc_funcs = ["today", "emptyDay", "calcPeelerRow", "computeAll"]
with open("src/utils/calculations.js", "w", encoding="utf-8") as f:
    f.write("export " + get_const("SEED_WORKERS") + "\n\n")
    for fn in calc_funcs:
        f.write("export " + get_func(fn) + "\n\n")

fmt_funcs = ["weekKey", "fmt", "fmtKg", "fmtPct"]
with open("src/utils/formatting.js", "w", encoding="utf-8") as f:
    for fn in fmt_funcs:
        f.write("export " + get_func(fn) + "\n\n")

with open("src/components/Inputs.jsx", "w", encoding="utf-8") as f:
    f.write('import { useState, useEffect } from "react";\n')
    f.write('import { ST } from "../utils/styles";\n\n')
    f.write("export " + get_func("NumInput") + "\n\n")
    f.write("export " + get_func("FormulaInput") + "\n\n")

with open("src/components/Helpers.jsx", "w", encoding="utf-8") as f:
    f.write('import { useState } from "react";\n')
    f.write('import { ST } from "../utils/styles";\n')
    f.write('import { NumInput } from "./Inputs";\n')
    f.write('import { fmtKg } from "../utils/formatting";\n\n')
    for fn in ["GlobalStyle", "Overlay", "Stat", "getPctColor", "RawTakenNote"]:
        f.write("export " + get_func(fn) + "\n\n")

with open("src/components/Tables.jsx", "w", encoding="utf-8") as f:
    f.write('import { ST } from "../utils/styles";\n')
    f.write('import { NumInput } from "./Inputs";\n')
    f.write('import { fmt, fmtKg, fmtPct } from "../utils/formatting";\n')
    f.write('import { getPctColor, RawTakenNote } from "./Helpers";\n\n')
    for fn in ["WageWorkerTable", "WorkerRow", "CardListPeeler", "CardListWage"]:
        f.write("export " + get_func(fn) + "\n\n")

with open("src/components/tabs/SummaryTab.jsx", "w", encoding="utf-8") as f:
    f.write('import { ST } from "../../utils/styles";\n')
    f.write('import { fmt, weekKey } from "../../utils/formatting";\n\n')
    f.write("export " + get_func("SummaryTab") + "\n\n")

with open("src/components/tabs/SettingsTab.jsx", "w", encoding="utf-8") as f:
    f.write('import { useState } from "react";\n')
    f.write('import { ST } from "../../utils/styles";\n\n')
    f.write("export " + get_func("SettingsTab") + "\n\n")

with open("src/components/tabs/CashBookTab.jsx", "w", encoding="utf-8") as f:
    f.write('import { useState, Fragment } from "react";\n')
    f.write('import { ST } from "../../utils/styles";\n')
    f.write('import { fmt } from "../../utils/formatting";\n')
    f.write('import { NumInput } from "../Inputs";\n\n')
    f.write("export " + get_func("CashBookTab") + "\n\n")
    f.write("export " + get_func("AddCashBookEntry") + "\n\n")

with open("src/components/tabs/StoreTab.jsx", "w", encoding="utf-8") as f:
    f.write('import { ST } from "../../utils/styles";\n')
    f.write('import { fmt } from "../../utils/formatting";\n\n')
    f.write("export " + get_func("StoreTab") + "\n\n")

with open("src/components/tabs/AuditTab.jsx", "w", encoding="utf-8") as f:
    f.write('import { ST } from "../../utils/styles";\n\n')
    f.write("export " + get_func("AuditTab") + "\n\n")

print("Splitting complete! Extracted structural files.")
