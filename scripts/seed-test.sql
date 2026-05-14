INSERT INTO users (id, email, name) VALUES ('00000000-0000-4000-8000-000000000001','test+ci@example.com','CI Test User');
INSERT INTO projects (id, user_id, domain, name, created_at) VALUES ('00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000001','example-shop.com','Example Shop', now());
INSERT INTO keywords (id, project_id, keyword, created_at) VALUES ('00000000-0000-4000-8000-000000000201','00000000-0000-4000-8000-000000000101','red sneakers', now()), ('00000000-0000-4000-8000-000000000202','00000000-0000-4000-8000-000000000101','running shoes', now());

