// Comprueba el filtrado, la búsqueda y el orden de la tabla de usuarios del backoffice (lib/admin.ts).
import { ago, countByFilter, filterUsers, sortUsers } from '../src/lib/admin.ts';
import type { AdminUserActivity } from '../src/lib/types.ts';

const NOW = Date.parse('2026-09-25T12:00:00Z');
const day = (n: number) => new Date(NOW - n * 86_400_000).toISOString();
const u = (id: string, o: Partial<AdminUserActivity>): AdminUserActivity => ({
  id, email: `${id}@x.co`, nombre: null, rol: 'user', estado: 'activa', correo_confirmado: true,
  creado: day(30), ultimo_acceso: day(1), suspendida_el: null, pausada_el: null, proyectos: 0, ...o,
});
const users = [
  u('ana', { nombre: 'Ángela Muñoz', ultimo_acceso: day(0) }),
  u('bob', { nombre: 'Bob', ultimo_acceso: day(20) }),
  u('cy', { nombre: 'Cy', ultimo_acceso: null, correo_confirmado: false }),
  u('dan', { nombre: 'Dan', estado: 'suspendida', ultimo_acceso: day(3), suspendida_el: day(2) }),
  u('eva', { nombre: 'Eva', estado: 'pausada', ultimo_acceso: day(5), pausada_el: day(4) }),
];
let fails = 0;
const ok = (c: boolean, m: string) => { if (!c) { fails++; console.error('FALLA:', m); } else console.log('ok  ', m); };
const ids = (l: AdminUserActivity[]) => l.map((x) => x.id).join(',');

ok(ids(filterUsers(users, '', 'todos', NOW)) === 'ana,bob,cy,dan,eva', 'todos');
ok(ids(filterUsers(users, '', 'suspendidas', NOW)) === 'dan', 'filtro suspendidas');
ok(ids(filterUsers(users, '', 'pausadas', NOW)) === 'eva', 'filtro pausadas');
ok(ids(filterUsers(users, '', 'sin_login', NOW)) === 'cy', 'filtro sin login (nunca entró)');
ok(ids(filterUsers(users, '', 'sin_confirmar', NOW)) === 'cy', 'filtro correo sin confirmar');
ok(ids(filterUsers(users, '', 'inactivos', NOW)) === 'bob', 'inactivos = >14 días sin login; quien nunca entró NO cuenta como inactivo');
ok(ids(filterUsers(users, 'angela', 'todos', NOW)) === 'ana', 'búsqueda sin tildes ni mayúsculas (Ángela ← angela)');
ok(ids(filterUsers(users, 'EVA@X', 'todos', NOW)) === 'eva', 'búsqueda por correo');
ok(ids(filterUsers(users, 'bob', 'suspendidas', NOW)) === '', 'búsqueda + filtro se combinan (AND)');
const c = countByFilter(users, NOW);
ok(c.todos === 5 && c.suspendidas === 1 && c.pausadas === 1 && c.sin_login === 1 && c.sin_confirmar === 1 && c.inactivos === 1, 'contadores por filtro');
ok(ids(sortUsers(users, { key: 'ultimo_acceso', dir: 'desc' })) === 'ana,dan,eva,bob,cy', 'último login desc: el más reciente primero, «nunca» al final');
ok(ids(sortUsers(users, { key: 'ultimo_acceso', dir: 'asc' })) === 'cy,bob,eva,dan,ana', 'último login asc: «nunca» primero');
ok(ids(sortUsers(users, { key: 'nombre', dir: 'asc' })) === 'ana,bob,cy,dan,eva', 'nombre asc ignora tildes (Ángela entre A)');
ok(ids(sortUsers(users, { key: 'creado', dir: 'asc' })) === 'ana,bob,cy,dan,eva', 'orden estable cuando hay empates');
ok(ago(day(0), NOW) === 'hoy' && ago(day(1), NOW) === 'hace 1 día' && ago(day(12), NOW) === 'hace 12 días' && ago(day(95), NOW) === 'hace 3 meses', 'ago()');
if (fails) process.exit(1);
console.log('Todo OK (check-admin-users.ts)');
