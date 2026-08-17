"""
zip.py 的测试用例
用法：python -m pytest test_zip.py -v
"""
import os
import sys
import zipfile
import tempfile
import pytest

sys.path.insert(0, os.path.dirname(__file__))
from zip import build_zip, EXCLUDE_FILES, EXCLUDE_DIRS


def make_tree(base, structure):
    """在 base 目录下按 structure 字典创建文件树。
    structure: { 'path/to/file': 'content', ... }
    """
    for rel, content in structure.items():
        full = os.path.join(base, rel.replace('/', os.sep))
        os.makedirs(os.path.dirname(full), exist_ok=True)
        with open(full, 'w', encoding='utf-8') as f:
            f.write(content)


def zip_names(dest):
    """返回 zip 包内所有文件名的集合。"""
    with zipfile.ZipFile(dest) as zf:
        return set(zf.namelist())


# ---------------------------------------------------------------------------
# 基本打包
# ---------------------------------------------------------------------------

def test_basic_files_included():
    """普通文件应被打包。"""
    with tempfile.TemporaryDirectory() as tmp:
        make_tree(tmp, {
            'index.html': '<html/>',
            'src/game.js': 'var x=1;',
            'src/style.css': 'body{}',
        })
        dest = os.path.join(tmp, 'deploy.zip')
        written = build_zip(tmp, dest)
        names = zip_names(dest)
        assert 'index.html' in names
        assert 'src/game.js' in names
        assert 'src/style.css' in names
        assert set(written) == names


# ---------------------------------------------------------------------------
# 排除规则：文件名
# ---------------------------------------------------------------------------

def test_gitignore_excludes():
    """.gitignore 中列出的文件/目录不应被打包。"""
    with tempfile.TemporaryDirectory() as tmp:
        make_tree(tmp, {
            'index.html': '<html/>',
            'dist/main.js': '// built',
            '.gitignore': 'dist/\n',
        })
        dest = os.path.join(tmp, 'deploy.zip')
        build_zip(tmp, dest)
        names = zip_names(dest)
        assert 'dist/main.js' not in names
        assert 'index.html' in names


def test_excludes_deploy_zip():
    """deploy.zip 自身不应被打包（避免递归）。"""
    with tempfile.TemporaryDirectory() as tmp:
        make_tree(tmp, {'index.html': '<html/>'})
        dest = os.path.join(tmp, 'deploy.zip')
        build_zip(tmp, dest)
        assert 'deploy.zip' not in zip_names(dest)


def test_gitignore_wildcard_excludes():
    """gitignore 通配符（如 *.log）应正确排除匹配文件。"""
    with tempfile.TemporaryDirectory() as tmp:
        make_tree(tmp, {
            'index.html': '<html/>',
            'debug.log': 'log data',
            'src/error.log': 'error data',
            '.gitignore': '*.log\n',
        })
        dest = os.path.join(tmp, 'deploy.zip')
        build_zip(tmp, dest)
        names = zip_names(dest)
        assert 'debug.log' not in names
        assert 'src/error.log' not in names
        assert 'index.html' in names


def test_excludes_dotenv_files():
    """.env 开头的文件不应被打包。"""
    with tempfile.TemporaryDirectory() as tmp:
        make_tree(tmp, {
            '.env': 'SECRET=1',
            '.env.local': 'SECRET=2',
            '.env.production': 'SECRET=3',
            'index.html': '<html/>',
        })
        dest = os.path.join(tmp, 'deploy.zip')
        build_zip(tmp, dest)
        names = zip_names(dest)
        assert '.env' not in names
        assert '.env.local' not in names
        assert '.env.production' not in names


# ---------------------------------------------------------------------------
# 排除规则：目录
# ---------------------------------------------------------------------------

def test_excludes_git_directory():
    """.git 目录下的文件不应被打包。"""
    with tempfile.TemporaryDirectory() as tmp:
        make_tree(tmp, {
            '.git/config': '[core]',
            '.git/HEAD': 'ref: refs/heads/main',
            'index.html': '<html/>',
        })
        dest = os.path.join(tmp, 'deploy.zip')
        build_zip(tmp, dest)
        names = zip_names(dest)
        assert not any(n.startswith('.git/') for n in names)


def test_excludes_node_modules():
    """node_modules 下的文件不应被打包。"""
    with tempfile.TemporaryDirectory() as tmp:
        make_tree(tmp, {
            'node_modules/lodash/index.js': 'module.exports={}',
            'index.html': '<html/>',
        })
        dest = os.path.join(tmp, 'deploy.zip')
        build_zip(tmp, dest)
        names = zip_names(dest)
        assert not any(n.startswith('node_modules/') for n in names)


def test_src_subdirectory_is_included():
    """src/ 子目录不应被误排除（历史 bug：dirs.clear() 导致跳过子目录）。"""
    with tempfile.TemporaryDirectory() as tmp:
        make_tree(tmp, {
            'index.html': '<html/>',
            'src/ds.js': 'var ds=1;',
            'src/game.js': 'var game=1;',
            'src/style.css': 'body{}',
        })
        dest = os.path.join(tmp, 'deploy.zip')
        build_zip(tmp, dest)
        names = zip_names(dest)
        assert 'src/ds.js' in names
        assert 'src/game.js' in names
        assert 'src/style.css' in names


# ---------------------------------------------------------------------------
# 路径格式
# ---------------------------------------------------------------------------

def test_paths_use_forward_slash():
    """zip 包内路径应使用正斜杠（跨平台兼容）。"""
    with tempfile.TemporaryDirectory() as tmp:
        make_tree(tmp, {'src/game.js': 'var x=1;'})
        dest = os.path.join(tmp, 'deploy.zip')
        build_zip(tmp, dest)
        names = zip_names(dest)
        assert all('\\' not in n for n in names)


# ---------------------------------------------------------------------------
# 空目录 / 空项目
# ---------------------------------------------------------------------------

def test_empty_project():
    """空项目（无文件）应生成合法空 zip，不报错。"""
    with tempfile.TemporaryDirectory() as tmp:
        dest = os.path.join(tmp, 'deploy.zip')
        written = build_zip(tmp, dest)
        assert written == []
        assert os.path.exists(dest)


def test_only_excluded_files():
    """全部是排除文件时，zip 包应为空。"""
    with tempfile.TemporaryDirectory() as tmp:
        make_tree(tmp, {
            'package-lock.json': '{}',
            '.env': 'SECRET=1',
            '.gitignore': '*.log\n',
        })
        dest = os.path.join(tmp, 'deploy.zip')
        written = build_zip(tmp, dest)
        assert written == []
        assert zip_names(dest) == set()


# ---------------------------------------------------------------------------
# .env 精确匹配（新增：区分机密文件与模板文件）
# ---------------------------------------------------------------------------

def test_env_example_is_included():
    """.env.example 是模板文件，应被打包。"""
    with tempfile.TemporaryDirectory() as tmp:
        make_tree(tmp, {
            '.env.example': 'SECRET=your_value_here',
            '.env.sample': 'SECRET=your_value_here',
            '.env.template': 'SECRET=your_value_here',
            'index.html': '<html/>',
        })
        dest = os.path.join(tmp, 'deploy.zip')
        build_zip(tmp, dest)
        names = zip_names(dest)
        assert '.env.example' in names
        assert '.env.sample' in names
        assert '.env.template' in names


def test_env_secret_files_excluded():
    """.env、.env.local、.env.production 是机密文件，不应被打包。"""
    with tempfile.TemporaryDirectory() as tmp:
        make_tree(tmp, {
            '.env': 'SECRET=1',
            '.env.local': 'SECRET=2',
            '.env.production': 'SECRET=3',
            'index.html': '<html/>',
        })
        dest = os.path.join(tmp, 'deploy.zip')
        build_zip(tmp, dest)
        names = zip_names(dest)
        assert '.env' not in names
        assert '.env.local' not in names
        assert '.env.production' not in names


# ---------------------------------------------------------------------------
# 新增排除项：构建配置与锁文件
# ---------------------------------------------------------------------------

def test_excludes_lock_files():
    """package-lock.json 等锁文件不应被打包。"""
    with tempfile.TemporaryDirectory() as tmp:
        make_tree(tmp, {
            'package-lock.json': '{}',
            'yarn.lock': 'lockfile',
            'pnpm-lock.yaml': 'lockfile',
            'index.html': '<html/>',
        })
        dest = os.path.join(tmp, 'deploy.zip')
        build_zip(tmp, dest)
        names = zip_names(dest)
        assert 'package-lock.json' not in names
        assert 'yarn.lock' not in names
        assert 'pnpm-lock.yaml' not in names


def test_excludes_ide_directories():
    """.vscode / .idea 目录不应被打包。"""
    with tempfile.TemporaryDirectory() as tmp:
        make_tree(tmp, {
            '.vscode/settings.json': '{}',
            '.idea/workspace.xml': '<project/>',
            'index.html': '<html/>',
        })
        dest = os.path.join(tmp, 'deploy.zip')
        build_zip(tmp, dest)
        names = zip_names(dest)
        assert not any(n.startswith('.vscode/') for n in names)
        assert not any(n.startswith('.idea/') for n in names)

