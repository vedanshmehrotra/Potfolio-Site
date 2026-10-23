"""Render source templates with explicit sample data; never import the app or open its DB."""
from pathlib import Path
import shutil
from jinja2 import Environment, FileSystemLoader, select_autoescape

source = Path('D:/ResolveFlow Project/frontend')
target = Path(__file__).resolve().parent.parent / 'tmp/project-previews/resolveflow'
target.mkdir(parents=True, exist_ok=True)
environment = Environment(loader=FileSystemLoader(source / 'templates'), autoescape=select_autoescape())
environment.globals['url_for'] = lambda endpoint, filename='': '/static/' + filename
sample = {
    'id': 101, 'complaint_text': 'The room light flickers and the internet connection keeps dropping.',
    'student_name': 'Sample student', 'room_number': 'A-204', 'timestamp': '2026-01-15 09:30',
    'review_issue': 'internet_network', 'review_confidence': .78, 'suggested_team': 'IT_NETWORK_TEAM',
    'predicted_urgency': 'medium'
}
for name, values in [('student.html', {'active_page': 'dashboard'}), ('decision_panel.html', {'complaints': [sample], 'active_priority': None, 'active_page': 'queue'})]:
    (target / name).write_text(environment.get_template(name).render(**values), encoding='utf-8')
shutil.copytree(source / 'static', target / 'static', dirs_exist_ok=True)
print('Rendered ResolveFlow source templates with sample data. No application database accessed.')
