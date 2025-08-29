-- Inserir espaços de exemplo
INSERT INTO public.spaces (name, description, capacity, price_per_hour, resources, is_active, created_by) VALUES
('Auditório Principal', 'Amplo auditório com sistema de som e projeção para grandes eventos e apresentações.', 100, 200, ARRAY['wifi', 'projetor', 'som', 'ar-condicionado'], true, null),
('Sala de Reunião A', 'Sala de reunião executiva com mesa para 8 pessoas, ideal para meetings corporativos.', 8, 50, ARRAY['wifi', 'tv', 'quadro-branco', 'ar-condicionado'], true, null),
('Sala de Treinamento', 'Sala equipada para treinamentos e workshops com capacidade para 20 pessoas.', 20, 80, ARRAY['wifi', 'projetor', 'quadro-branco', 'flipchart'], true, null),
('Sala Criativa', 'Espaço colaborativo com ambiente descontraído para brainstorming e criação.', 6, 60, ARRAY['wifi', 'quadro-branco', 'ar-condicionado'], true, null),
('Sala de Reunião B', 'Sala de reunião compacta para pequenos grupos e reuniões rápidas.', 12, 60, ARRAY['wifi', 'tv', 'ar-condicionado'], true, null);