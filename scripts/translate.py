import os
import re
from deep_translator import GoogleTranslator

translator = GoogleTranslator(source='zh-CN', target='en')

def translate_text(text):
    try:
        translated = translator.translate(text)
        return translated if translated else text
    except Exception as e:
        print(f"Error translating: {text} - {e}")
        return text

def has_chinese(text):
    return bool(re.search(r'[\u4e00-\u9fff]', text))

# iterate through all files
for root, dirs, files in os.walk('.'):
    # exclude target, node_modules, .git
    if 'target' in root or '.git' in root or 'node_modules' in root:
        continue
    for file in files:
        if file.endswith('.rs') or file.endswith('.toml'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            lines = content.split('\n')
            changed = False
            for i, line in enumerate(lines):
                if has_chinese(line):
                    # For Rust line comments
                    if '//' in line:
                        code, comment = line.split('//', 1)
                        if has_chinese(comment):
                            # if it started with a space, strip it because we add one
                            translated_comment = translate_text(comment)
                            lines[i] = code + '// ' + translated_comment.strip()
                            changed = True
                    # For TOML comments
                    elif '#' in line:
                        code, comment = line.split('#', 1)
                        if has_chinese(comment):
                            translated_comment = translate_text(comment)
                            lines[i] = code + '# ' + translated_comment.strip()
                            changed = True
                    # For TOML string values like description = "..."
                    elif ' = "' in line and file.endswith('.toml'):
                        parts = line.split(' = "', 1)
                        if len(parts) == 2:
                            key = parts[0]
                            val = parts[1].rsplit('"', 1)[0]
                            rest = parts[1][len(val)+1:]
                            if has_chinese(val):
                                translated_val = translate_text(val)
                                lines[i] = f'{key} = "{translated_val}"{rest}'
                                changed = True
                    # For strings in Rust
                    elif '"' in line and file.endswith('.rs'):
                        parts = line.split('"')
                        if len(parts) >= 3:
                            new_parts = []
                            line_changed = False
                            for j, p in enumerate(parts):
                                if j % 2 == 1 and has_chinese(p): # inside quotes
                                    translated_p = translate_text(p)
                                    new_parts.append(translated_p)
                                    line_changed = True
                                else:
                                    new_parts.append(p)
                            if line_changed:
                                lines[i] = '"'.join(new_parts)
                                changed = True
            
            if changed:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write('\n'.join(lines))
                print(f"Translated {filepath}")
