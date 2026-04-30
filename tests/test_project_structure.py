import unittest
from pathlib import Path


class ProjectStructureTest(unittest.TestCase):
    def test_expected_tooling_files_exist(self):
        root = Path(__file__).resolve().parents[1]
        required_paths = [
            root / 'README.md',
            root / 'VERSION',
            root / 'CHANGELOG.md',
            root / 'docs' / 'QUICKSTART.md',
            root / 'scripts' / 'serve_local_album.py',
        ]
        for path in required_paths:
            self.assertTrue(path.exists(), f'missing project file: {path.relative_to(root)}')


if __name__ == '__main__':
    unittest.main()
