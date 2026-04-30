import re
import unittest
from pathlib import Path


class LocalIgUiWiringTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = (Path(__file__).resolve().parents[1] / 'local-ig.html').read_text(encoding='utf-8')

    def test_key_homepage_buttons_exist(self):
        required_ids = [
            'btnOpen',
            'btnWelcomeOpen',
            'btnShowIG',
            'btnHHCat',
            'btnShowXHS',
            'igFetchBtn',
            'xhsFetchBtn',
            'btnRefresh',
            'btnTranslate',
            'btnAddPosts',
        ]
        for element_id in required_ids:
            self.assertRegex(
                self.html,
                rf'id="{re.escape(element_id)}"',
                msg=f'missing DOM element: {element_id}',
            )

    def test_key_homepage_buttons_have_click_bindings(self):
        required_bindings = [
            r"btnOpen\s*\.\s*addEventListener\(\s*'click'\s*,\s*openFolder\s*\)",
            r"\$\(\s*'btnWelcomeOpen'\s*\)\s*\.\s*addEventListener\(\s*'click'\s*,\s*openFolder\s*\)",
            r"\$\(\s*'btnShowIG'\s*\)\s*\.\s*addEventListener\(\s*'click'",
            r"\$\(\s*'btnHHCat'\s*\)\s*\.\s*addEventListener\(\s*'click'\s*,\s*hhcatConvert\s*\)",
            r"\$\(\s*'btnShowXHS'\s*\)\s*\.\s*addEventListener\(\s*'click'",
            r"\$\(\s*'igFetchBtn'\s*\)\s*\.\s*addEventListener\(\s*'click'",
            r"\$\(\s*'xhsFetchBtn'\s*\)\s*\.\s*addEventListener\(\s*'click'",
            r"\$\(\s*'btnRefresh'\s*\)\s*\.\s*addEventListener\(\s*'click'",
            r"\$\(\s*'btnTranslate'\s*\)\s*\.\s*addEventListener\(\s*'click'",
            r"\$\(\s*'btnAddPosts'\s*\)\s*\.\s*addEventListener\(\s*'click'",
        ]
        for pattern in required_bindings:
            self.assertIsNotNone(
                re.search(pattern, self.html, flags=re.S),
                msg=f'missing click binding: {pattern}',
            )


if __name__ == '__main__':
    unittest.main()
