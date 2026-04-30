import unittest
from pathlib import Path


class TranslateCommandRuntimeTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = (Path(__file__).resolve().parents[1] / 'local-ig.html').read_text(encoding='utf-8')

    def test_translate_command_uses_py_launcher_on_windows(self):
        self.assertIn("function getPreferredPythonCommand()", self.html)
        self.assertIn("return isWin?'py -3':'python'", self.html)
        self.assertIn('`${getPreferredPythonCommand()} "${getTransScriptPath()}"', self.html)


if __name__ == '__main__':
    unittest.main()
