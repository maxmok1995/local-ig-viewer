import re
import subprocess
import tempfile
import unittest
from pathlib import Path


class LocalIgSyntaxTest(unittest.TestCase):
    def test_local_ig_inline_scripts_are_valid_javascript(self):
        html_path = Path(__file__).resolve().parents[1] / 'local-ig.html'
        html = html_path.read_text(encoding='utf-8')
        scripts = re.findall(r'<script[^>]*>(.*?)</script>', html, flags=re.S | re.I)

        self.assertGreaterEqual(len(scripts), 1, 'expected at least one inline script in local-ig.html')

        for idx, script in enumerate(scripts, start=1):
            with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False, encoding='utf-8') as f:
                f.write(script)
                temp_js = f.name
            try:
                proc = subprocess.run(
                    ['node', '--check', temp_js],
                    capture_output=True,
                    text=True,
                    encoding='utf-8',
                    timeout=10,
                )
            finally:
                Path(temp_js).unlink(missing_ok=True)

            self.assertEqual(
                proc.returncode,
                0,
                f'inline script #{idx} failed syntax check:\n{proc.stderr}',
            )


if __name__ == '__main__':
    unittest.main()
