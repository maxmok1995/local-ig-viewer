import unittest
from pathlib import Path


class TranslateCommandTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = (Path(__file__).resolve().parents[1] / 'local-ig.html').read_text(encoding='utf-8')

    def test_translate_folder_path_prefers_root_abs_path_over_html_dir_guess(self):
        self.assertIn("function getFreshFolderPath()", self.html)
        self.assertNotIn("return (dir&&S.rootName)?`${dir}/${S.rootName}`:(S.rootAbsPath||'');", self.html)
        self.assertIn("if(S.rootAbsPath) return S.rootAbsPath;", self.html)


if __name__ == '__main__':
    unittest.main()
