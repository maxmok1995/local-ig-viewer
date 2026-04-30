import unittest
from pathlib import Path


class RootPathBehaviorTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = (Path(__file__).resolve().parents[1] / 'local-ig.html').read_text(encoding='utf-8')

    def test_read_folder_does_not_rewrite_matching_root_path_to_html_source_dir(self):
        self.assertNotIn('const fresh=htmlDir?`${htmlDir}/${root.name}`:null;', self.html)

    def test_browser_side_import_does_not_persist_html_source_dir_as_path_txt(self):
        self.assertNotIn('const absGuess=htmlDir ? `${htmlDir}/${root.name}` : root.name;', self.html)

    def test_open_folder_path_prefers_real_saved_root_path(self):
        self.assertIn('S.rootAbsPath=raw;', self.html)
        self.assertIn('return alb.rootAlbum ? S.rootAbsPath : `${S.rootAbsPath}/${rel}`;', self.html)


if __name__ == '__main__':
    unittest.main()
