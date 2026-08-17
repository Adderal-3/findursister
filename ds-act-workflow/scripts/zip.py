# -*- coding: utf-8 -*-
"""
ds-act-skills 打包脚本
依赖：pip install pathspec
用法：
  python <path-to-skill>/zip.py          # 打包当前目录（情况 B：无 build 脚本）
  python <path-to-skill>/zip.py dist     # 打包指定子目录（情况 A：有 build 脚本）
在 H5 项目根目录下执行，生成 deploy.zip
排除规则：.gitignore（优先）+ EXCLUDE_DIRS + EXCLUDE_FILES + .env 机密文件
"""
import sys
import os
import pathspec
import zipfile

EXCLUDE_FILES = {
    'deploy.zip', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
    '.gitignore', '.gitattributes', '.editorconfig',
    'tsconfig.json', 'vite.config.js', 'vite.config.ts',
    'webpack.config.js', 'webpack.config.ts',
    'README.md', '.DS_Store', 'Thumbs.db',
}
EXCLUDE_DIRS = {'.git', 'node_modules', '.vscode', '.idea', '.pytest_cache', '__pycache__'}

# .env 精确匹配：排除 .env 本身及 .env.<suffix>，但保留 .env.example / .env.sample
_ENV_KEEP = {'.env.example', '.env.sample', '.env.template'}


def _is_env_file(name):
    """仅排除真实的 .env 机密文件，保留模板文件。"""
    if name in _ENV_KEEP:
        return False
    return name == '.env' or name.startswith('.env.')

def _load_gitignore(root_dir):
    """读取根目录 .gitignore，返回 pathspec 对象（失败时返回 None）。"""
    gf = os.path.join(root_dir, '.gitignore')
    if not os.path.isfile(gf):
        return None
    try:
        with open(gf, 'r', encoding='utf-8') as f:
            return pathspec.PathSpec.from_lines('gitignore', f)
    except (ImportError, OSError):
        return None

def build_zip(src, dest):
    """
    将 src 目录打包为 dest zip 文件。
    - 读取 .gitignore，排除匹配的文件/目录
    - 跳过 EXCLUDE_DIRS 中的目录
    - 跳过 EXCLUDE_FILES 中的文件名（仅 basename 比对）
    - 跳过 .env 机密文件（保留 .env.example 等模板）
    返回写入的文件路径列表（相对路径）。
    """
    git_spec = _load_gitignore(src)
    written = []
    with zipfile.ZipFile(dest, 'w', zipfile.ZIP_DEFLATED) as zf:
        for root, dirs, files in os.walk(src):
            # 目录级排除（先走 gitignore，再走硬编码白名单）
            filtered_dirs = []
            for d in dirs:
                rel = os.path.relpath(os.path.join(root, d), src).replace(os.sep, '/') + '/'
                if d in EXCLUDE_DIRS:
                    continue
                if git_spec and git_spec.match_file(rel):
                    continue
                filtered_dirs.append(d)
            dirs[:] = filtered_dirs

            for f in files:
                full = os.path.join(root, f)
                rel = os.path.relpath(full, src).replace(os.sep, '/')
                if f in EXCLUDE_FILES or _is_env_file(f):
                    continue
                if git_spec and git_spec.match_file(rel):
                    continue
                zf.write(full, rel)
                written.append(rel)
    return written


if __name__ == '__main__':
    cwd = os.getcwd()
    sub = sys.argv[1] if len(sys.argv) > 1 else None
    src = os.path.join(cwd, sub) if sub else cwd
    if not os.path.isdir(src):
        print(f'错误：目录不存在：{src}', file=sys.stderr)
        sys.exit(1)
    dest = os.path.join(cwd, 'deploy.zip')
    written = build_zip(src, dest)
    for rel in written:
        print('  +', rel)
    print(f'打包完成，大小: {os.path.getsize(dest)} bytes')
