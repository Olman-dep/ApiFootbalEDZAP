## CONTEXTO DE CONTINUIDAD DEL PROYECTO

**Estado actual:** Módulo `users` (crear, editar, eliminar) escrito en la conversación 1, pendiente de integrar y verificar en el repositorio real. No se ha revisado la estructura real del repo; la ubicación `src/modules/users/` es un supuesto.

**Funcionalidades implementadas y verificadas:** Ninguna verificada todavía.

**Funcionalidades escritas pero NO verificadas:**
- Usuario: POST /users, PATCH /users/:id, DELETE /users/:id (sin lectura/listado, sin cambio de contraseña, sin autenticación).

**Arquitectura y decisiones confirmadas:** NestJS, TypeScript, MongoDB con Mongoose y arquitectura modular con principios hexagonales. Las decisiones adicionales deben confirmarse con el código y las conversaciones previas disponibles.

**Decisiones técnicas tomadas en el módulo users (pendientes de confirmar por el usuario):**
- Capas: domain (entidad, enum de plan, errores, puertos), application (casos de uso), infrastructure (persistence, security, http).
- Puertos como clases abstractas (`UserRepository`, `PasswordHasher`) usadas como tokens de inyección de Nest.
- Casos de uso con `@Injectable()` de Nest (pragmatismo; alternativa: useFactory).
- IDs: UUID generado en el dominio (randomUUID), guardado como `_id` string en Mongo; controlador valida con ParseUUIDPipe.
- Email normalizado a minúsculas; unicidad por índice único en Mongo y comprobación previa en los casos de uso; el código 11000 se traduce a UserAlreadyExistsError.
- Eliminación física (hard delete).
- PATCH edita solo name, email y plan; la contraseña no se cambia por ahí.
- Hash de contraseña con bcrypt (12 rondas), aislado tras `PasswordHasher`; password entre 8 y 72 caracteres.
- Errores de dominio mapeados a HTTP con `UserDomainExceptionFilter`: 404 (no existe), 409 (email duplicado), 400 (datos inválidos).
- Respuestas sin passwordHash, mediante `user.presenter.ts`.
- Planes `FREE`, `PRO`, `PREMIUM` son un valor provisional inventado; deben reemplazarse por los planes reales.

**Archivos y módulos relevantes:** `src/modules/users/` con users.module.ts; domain/ (user.entity.ts, user-plan.enum.ts, errors/domain.error.ts, errors/user.errors.ts, ports/user.repository.ts, ports/password-hasher.port.ts); application/use-cases/ (create-user, update-user, delete-user); infrastructure/persistence/ (user.schema.ts, user.mapper.ts, mongoose-user.repository.ts); infrastructure/security/bcrypt-password-hasher.ts; infrastructure/http/ (user.controller.ts, user-domain-exception.filter.ts, user.presenter.ts, dto/create-user.dto.ts, dto/update-user.dto.ts). Cambios requeridos fuera del módulo: importar UsersModule en app.module.ts y ValidationPipe global en main.ts.

**Dependencias nuevas:** bcrypt, @types/bcrypt, class-validator, class-transformer.

**Pruebas y verificaciones:** Ninguna ejecutada (no se corrió tsc, lint ni tests).

**Problemas conocidos y pendientes:**
- Verificar que compile e integrar con la estructura real del repo.
- Reemplazar los planes provisionales por los reales.
- Endpoints sin autenticación ni autorización (cualquiera podría cambiar el plan); decidir estrategia.
- Decidir si se requiere borrado lógico en lugar de físico.
- Falta lectura/listado de usuarios y cambio de contraseña.
- Sin pruebas unitarias ni e2e.

**Próximo paso:** Integrar y compilar el módulo en el repo, y luego escribir pruebas unitarias de los casos de uso (o lo que el usuario indique).

**Historial breve de decisiones y avances:**
1. Conversación 1: se definió y escribió el módulo `users` (crear, editar, eliminar) en las tres capas hexagonales, con los supuestos indicados arriba.