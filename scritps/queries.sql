--la creme de la creme
-- HSR maximo de todo el partido, y la mar en coche
WITH sprint_data AS (
    SELECT 
        player_display_name, 
        time,
        speed,
        hsr_total_calc, 
        distancia_total_calc,
        LAG(hsr_total_calc) OVER (PARTITION BY player_display_name ORDER BY time) AS prev_hsr,
        LEAD(hsr_total_calc) OVER (PARTITION BY player_display_name ORDER BY time) AS next_hsr
    FROM public.danubio_processed_view
),
grouped_sprints AS (
    SELECT
        player_display_name,
        time,
        speed,
        hsr_total_calc,
        distancia_total_calc,
        -- Definir cuándo empieza un nuevo sprint (de 0 a >19.8)
        SUM(CASE 
            WHEN prev_hsr = 0 AND hsr_total_calc > 0 THEN 1 
            ELSE 0 
        END) OVER (PARTITION BY player_display_name ORDER BY time) AS sprint_id
    FROM sprint_data
),
sprints_summary AS (
    SELECT
        player_display_name,
        sprint_id,
        MIN(time) AS sprint_start_time,
        MAX(time) AS sprint_end_time,
        SUM(distancia_total_calc) AS total_sprint_distance,
        MAX(hsr_total_calc) AS max_hsr_total_calc
    FROM grouped_sprints
    WHERE hsr_total_calc > 0  -- Considerar solo las filas donde se superó el umbral
    GROUP BY player_display_name, sprint_id
)
SELECT *
FROM sprints_summary
WHERE (player_display_name, max_hsr_total_calc) IN (
    SELECT player_display_name, MAX(max_hsr_total_calc)
    FROM sprints_summary
    GROUP BY player_display_name
);







-- Esta da todos los sprints y sus distancias

WITH sprint_data AS (
    SELECT 
        player_display_name, 
        time,
        speed,
        hsr_total_calc, 
        distancia_total_calc,
        LAG(hsr_total_calc) OVER (PARTITION BY player_display_name ORDER BY time) AS prev_hsr,
        LEAD(hsr_total_calc) OVER (PARTITION BY player_display_name ORDER BY time) AS next_hsr
    FROM public.danubio_processed_view
),
grouped_sprints AS (
    SELECT
        player_display_name,
        time,
        speed,
        hsr_total_calc,
        distancia_total_calc,
        -- Definir cuándo empieza un nuevo sprint (de 0 a >19.8)
        SUM(CASE 
            WHEN prev_hsr = 0 AND hsr_total_calc > 0 THEN 1 
            ELSE 0 
        END) OVER (PARTITION BY player_display_name ORDER BY time) AS sprint_id
    FROM sprint_data
)
SELECT
    player_display_name,
    sprint_id,
    MIN(time) AS sprint_start_time,
    MAX(time) AS sprint_end_time,
    SUM(distancia_total_calc) AS total_sprint_distance,
    MAX(hsr_total_calc) AS max_hsr_total_calc  -- Obtener el valor máximo de HSR en cada sprint
FROM grouped_sprints
WHERE hsr_total_calc > 0  -- Considerar solo las filas donde se superó el umbral
GROUP BY player_display_name, sprint_id
ORDER BY player_display_name, sprint_id;







---- QUERIES DESDE 11/12/2024
-- DROP SCHEMA public;

-- CREATE SCHEMA public AUTHORIZATION nacional;

COMMENT ON SCHEMA public IS 'standard public schema';
-- public.administrativo definition

-- Drop table

-- DROP TABLE public.administrativo;

CREATE TABLE public.administrativo (
	"Jugador" varchar(50) NULL,
	"Fecha_Nacimiento" varchar(50) NULL,
	"Documento_de_Identidad" int4 NULL,
	"Pasaporte" varchar(50) NULL,
	"Telefono" varchar(50) NULL,
	"Celular" varchar(50) NULL,
	"Email" varchar(50) NULL,
	"Cobertura_Medica" varchar(50) NULL,
	"Estudios" varchar(50) NULL,
	"Oriundo" varchar(50) NULL,
	"Club_de_Origen" varchar(50) NULL,
	"Club_de_Origen_Porcentaje" varchar(50) NULL,
	"Posicion" varchar(50) NULL
);


CREATE TABLE public.stats (
	"cedula" int4 NULL,
	"alias" varchar(50) NULL,
	"masaF0" varchar(50) NULL,
	"sumatoriaPliegues" varchar(50) NULL,
	"relacionMusculoHueso" varchar(50) NULL
);

-- Permissions

ALTER TABLE public.administrativo OWNER TO nacional;
GRANT ALL ON TABLE public.administrativo TO nacional;




-- Permissions

GRANT ALL ON SCHEMA public TO nacional;
GRANT ALL ON SCHEMA public TO public;

INSERT INTO public.administrativo ("Jugador","Fecha_Nacimiento","Documento_de_Identidad","Pasaporte","Telefono","Celular","Email","Cobertura_Medica","Estudios","Oriundo","Club_de_Origen","Club_de_Origen_Porcentaje","Posicion") VALUES
	 ('Amaral Axell','14/02/2007',56879918,'','','95519865','axellamaral0@gmail.com','Asociación Española','3er año',' Colegio Pallotti','Cerro Largo','Melo Wanderers',''),
	 ('Arady Bruno','01/07/2007',56845349,'','','93984127','danar.72@hotmail.com','MP','Jesus Maria 2do año de liceo','Montevideo','Nuevo Juventud','','Volante Exterior Izquierdo'),
	 ('Bazzano Misael','03/01/2007',56303010,'','','','','','','','','','Mediapunta'),
	 ('Borges Tapia Facundo Ivanovich','12/05/2007',56580016,'','','91854885','ivanso2011@hotmail.com','Médica Uruguaya','Segundo año ciclo básico',' Liceo 24','Melo',' Cerro Largo','Club La Cuchilla'),
	 ('Cabrera Ignacio','12/05/2007',56530613,'','23140549','92989818','Nachooocabreraa5@gmail.com','CASMU','Liceo 11 Bruno Mauricio de Zabala 2do','','Nuevo Juventud','','Lateral Derecho'),
	 ('Clematte Román','06/09/2007',56794752,'','','95452572','paulclematte19@gmail.com','Medica Uruguaya','2do Año de UTU','Montevideo','Santa Catalina','','Defensa Central'),
	 ('Denis Juan Francisco','01/01/2007',56285690,'','','92034515','juanfranciscodeniseli@gmail.com','IAC','Palloti','3ero de ciclo básico','Treinta y Tres','Yerbalito',''),
	 ('Domínguez Facundo','15/07/2007',56837413,'','23376277','92919925','elpepe1705@hotmail.com','ASSE','Pallotti 2do año','Montevideo','Wanderers','','Delantero'),
	 ('Espalter Rodrigo','23/02/2007',56920163,'','','98795047','royespalter@gmail.com','Asociación Española','Pallotti Tercer Año','Fray Bentos','Fray Bentos','','Volante Exterior Derecho'),
	 ('Fregueiro Bruno','07/06/2007',56809729,'','','091463805@gmail.com','Fregueirobruno@gmail.com','Sanatorio Americano','2° Pallotti','Treinta y Tres','Yerbalito','','Lateral Izquierdo');
INSERT INTO public.administrativo ("Jugador","Fecha_Nacimiento","Documento_de_Identidad","Pasaporte","Telefono","Celular","Email","Cobertura_Medica","Estudios","Oriundo","Club_de_Origen","Club_de_Origen_Porcentaje","Posicion") VALUES
	 ('García Martín','26/03/2007',56521830,'','26814442','97500148','martingarciajunior07@gmail.com','SMI','5to año de liceo - Liceo Shangrila','Montevideo','Nacional AUFI','','Arquero'),
	 ('Gauthier Gaston','05/04/2007',56465955,'','','','','','','','','','Arquero'),
	 ('González Santiago','04/10/2007',56784555,'','','','','','','','','','Arquero'),
	 ('Iliaria Gianluca','19/02/2007',56413479,'D217413','24008525','92559071','gilaria2007@gmail.com','Circulo catolico','IAVA 5to año bachillerato','Montevideo','Bella Vista','30','00%'),
	 ('Martinez Anderson','28/04/2007',571616830,'','-','092 291 461?','-','ASSE','Pase para 3 año','Artigas','Independencia Artigas','','Volante Exterior Izquierdo'),
	 ('Martínez Mauro','19/01/2007',56364329,'','25110392','97407822','mauromartinez192007@gmail.com','ASSE','5to año de liceo - Liceo Damaso','Montevideo','7 estrellas','','Volante Central'),
	 ('Milano Mauricio','01/03/2007',56740002,'','230921632','94886865','mauriciomilanobertiz@gmail.com','CASMU','Mariano 2do','Montevideo','Carlitos Prado','','Volante Central'),
	 ('Montaos Luciano','09/02/2007',56630461,'D226280','23237295','93306828','lucianomontaos2018@gmail.com','CUDAM','3° Liceo 74','Montevideo','Independiente Lezica','','Lateral Izquierdo'),
	 ('Montes de Oca Sebastián','30/07/2007',56740632,'','26243711','92271106','Sebaeloonce@gmail.com','SMI','Logosófico 2do año','Montevideo','Rayo Rojo','','Volante Exterior Derecho'),
	 ('Morales Lautaro','10/07/2007',56658384,'','22274601','96323265','titimoralitobolso@gmail.com','Hospital Militar','2° Liceo 25','Montevideo','Nacional AUFI','','Volante Central');
INSERT INTO public.administrativo ("Jugador","Fecha_Nacimiento","Documento_de_Identidad","Pasaporte","Telefono","Celular","Email","Cobertura_Medica","Estudios","Oriundo","Club_de_Origen","Club_de_Origen_Porcentaje","Posicion") VALUES
	 ('Mysznajes Sebastían','24/03/2007',56542482,'D313179','','98510588','sebasmysz@gmail.com','Hospital Británico','Pallotti 3er año','Montevideo','Uruguay Buceo','','Defensa Central'),
	 ('Oliva Gonzalo','29/05/2007',56676213,'D203264','23473568','91434605','Gonzalooliva007@gmail.com','GREMCA','2° San José de la Providencia','Montevideo','Nuevo Juventud','','Volante Central'),
	 ('Perez Octavio','28/11/2007',57113822,'','','','','','','','','','Volante Central'),
	 ('Ricca Santiago','03/11/2007',56935439,'','','','','','','','','','Delantero'),
	 ('Rodríguez Luciano','15/03/2007',56382838,'','22271916','97684807','lucianoemanuelrodriguezborges@gmail.com','MSP','Liceo 67 Cursando Tercero','Montevideo','Estrella De Oro','','Defensa Central'),
	 ('Soria Mateo','14/03/2007',56496027,'','23039748','95584104','Juliapalaveper@gmail.com','Médica Uruguaya','3er año en liceo n°66 Parque tejano','Montevideo','Nuevo Juventud','','Volante Central'),
	 ('Trucido Guzman','14/03/2007',56451439,'','44728861','91904814','guzmandanu14@gmail.com','Asociacion Española','5to año Pallotti','Rocha','Rocha FC','30','00%'),
	 ('Abreu Mateo','02/03/2009',57843728,'','23660573','93407996','mateoabreu009@gmail.com','CRAMI','3er año liceo - Liceo n°2 German Cabrera','Las Piedras','Nacional AUFI','','Volante Interior Derecho'),
	 ('Aguilera Sánchez Alexis Sebastián','25/02/2009',57833866,'','','95938501','jaimealexis127@gmail.com','CRAMI','2do de liceo','Las Piedras','San Luis (las piedras)','','Volante Exterior Derecho'),
	 ('Amaro Thiago','11/04/2009',57910008,'','23137023','96478178','losmolisson3@gmail.com','Circulo catolico','3ro liceo, n°11','Montevideo','Zorzal Baby Fútbol','','Lateral Derecho');
INSERT INTO public.administrativo ("Jugador","Fecha_Nacimiento","Documento_de_Identidad","Pasaporte","Telefono","Celular","Email","Cobertura_Medica","Estudios","Oriundo","Club_de_Origen","Club_de_Origen_Porcentaje","Posicion") VALUES
	 ('Barrera Acosta Benjamín Rodrigo','30/04/2009',57974795,'','','95786081','benja120056@gmail.com','HCFFAA','3ro de liceo, n°62','Montevideo','Nacional AUFI','','Volante Interior Derecho'),
	 ('Benítez Cardozo Anderson Josué','22/01/2009',57776551,'','','091 793 098','elchiky260186@gmail.com','ASSE','2do de liceo','Toledo','Siete Estrellas','','Volante Exterior Derecho'),
	 ('Berguncio Roascio Mateo','11/09/2009',58162595,'','','091 577 614','mateoberguncio@gmail.com','CAM','2do de liceo','Salto','Ferrocarril','','Volante Exterior Derecho'),
	 ('Bueno Olivera Bruno Leonardo','03/01/2009',57853618,'','','092 028 954','alebrabru@gmail.com','ASSE','2do de liceo','Artigas','Nacional (Artigas)','','Volante Central'),
	 ('Caraballo Ortiz Gianluca Genaro','11/05/2009',57997715,'','','98043112','alaniscaraballo14@gmail.com','ASSE','De. Medulio Pérez Fontana (Nueva Palmira)','Carmelo','Club deportivo sacachispas','','Arquero'),
	 ('Chiesa Carluccio Agustin','28/03/2009',57890709,'','43455874','98066399','chiesaagustin22@gmail.com','Asociacion Española','Colegio San José , 3er año','Montevideo','Club Atlético Juventud Unida','','Volante Interior Derecho'),
	 ('De Leon Felipe','20/04/2009',57930628,'','43152019','99457559','felipedeleonphi@gmail.com','Comeca','Liceo José Alonso y Trelles 3er año','Tala','Atenas de Tala','','Volante Interior Izquierdo'),
	 ('Gancheff Juan Pablo','20/04/2009',57936581,'','43133527','092 200 165','gancheffjuampi@gmail.com','COMECA','Liceo Santa Rosa( Loreto Daniel vidart) 3er año','Canelones','Unión baby fútbol','','Volante Exterior Izquierdo'),
	 ('García Ruiz Ramiro','06/06/2009',58007062,'C891494','45522831','98338221','ramigarcia0606@gmail.com','Camec','2do de liceo','Rosario','Rosario Atletico','','Volante Central'),
	 ('Grudzien Tomas','21/05/2009',57981558,'D367975','26017274','98647903','tomasgrudzien2009@gmail.com','Seguro Americano','2do de liceo St.Patricks','Montevideo','Náutico Rojo','','Lateral Derecho');
INSERT INTO public.administrativo ("Jugador","Fecha_Nacimiento","Documento_de_Identidad","Pasaporte","Telefono","Celular","Email","Cobertura_Medica","Estudios","Oriundo","Club_de_Origen","Club_de_Origen_Porcentaje","Posicion") VALUES
	 ('Jaime Parceriza Manuel Andrés','20/09/2009',58286486,'','43133506','93479424','parcerizanatalia@gmail.com','ASSE','2do de liceo','Santa Rosa','Union Santa Rosa','','Volante Interior Derecho'),
	 ('Laureiro Correa Santiago Emanuel','14/01/2009',57832840,'','43760929','97465236','santiagolaureiro10@gmail.com','Casmu','3er año liceo','Quito, Ecuador','Neptunia','','Volante Exterior Derecho'),
	 ('Márquez de Lima Álvarez Juan Andrés','09/12/2009',58308181,'','','92308778','noeliaalv_29@hotmail.com','MUCAM','2do de liceo','Cerro Chato','River FC','','Volante Exterior Derecho'),
	 ('Matonte Santiago','22/05/2009',57986956,'','','92757954','santiagomatonte34@gmail.com','Comeflo','2do de liceo','Trinidad','Porongos','','Volante Interior Izquierdo'),
	 ('Milesi Fausto','07/04/2009',61863760,'YB5874531','26829502','97133163','Fausto.Milesi.18@gmail.com','Blue Cross','The British Schools 2do liceo','Beijing, China','Carrasco Polo','','Volante Exterior Derecho'),
	 ('Sanchez Augusto','08/02/2009',57802631,'','','91203061','augustototosmaxi@gmail.com','Sanatorio Americano','3er año liceo','Rosario','Colegiales','','Arquero'),
	 ('Moreira Ibarra Luis Felipe','12/08/2009',58325066,'D 617162','27072148','91435344','pelocha31@hotmail.com','MP','San Juan Bautista 2do liceo','Barranquilla, Colombia','Enrique Lopez','','Lateral Izquierdo'),
	 ('Muñiz Larrauri Lautaro','26/03/2009',57887099,'','43648572','99455231','munizlautaro464@gmail.com','','3ro de liceo Pallotti','Flores','Nacional (Trinidad)','','Defensa Central'),
	 ('Perez Chapitel Fernando Ezequiel','17/04/2009',57919816,'','46240145','91257536','fernandowtf09@gmail.com','Casmer','3er año liceo','Rivera','Huracan (Rivera)','','Volante Exterior Derecho'),
	 ('Robotti Kalo','07/01/2009',57750250,'','27162070','96220002','kalorobotti@gmail.com','Impasa','San Juan Bautista 3ro liceo','Montevideo','Estrella del sur','','Volante Exterior Derecho');
INSERT INTO public.administrativo ("Jugador","Fecha_Nacimiento","Documento_de_Identidad","Pasaporte","Telefono","Celular","Email","Cobertura_Medica","Estudios","Oriundo","Club_de_Origen","Club_de_Origen_Porcentaje","Posicion") VALUES
	 ('Rodriguez Zinola Santino Alejandro','15/01/2009',57766291,'','','092 835 765','santizinola@gmail.com','CAMEPA','liceo 1 de pando, tercer año','Pando','Atlanta de Pando','','Defensa Central'),
	 ('Saldaña Marin Facundo Nicolás','04/04/2009',57925227,'','47726262','99538152','juanmariafacu@gmail.com','ASSE','2do de liceo','Artigas','Nacional (Artigas)','','Volante Exterior Izquierdo'),
	 ('Sanchez Augusto','08/02/2009',57802631,'','','91203061','augustototosmaxi@gmail.com','Sanatorio Americano','3er año liceo','Rosario','Colegiales','','Arquero'),
	 ('Santana Britos Teylonn Daniel','23/01/2009',57853680,'','47793541','92471332','teylonnbritos@gmail.com','Hospital Militar','Ciclo básico utu sauce 3er año','Sauce','','','Volante Interior Izquierdo'),
	 ('Silvera González Joaquín Luciano','14/03/2009',57864176,'','','094 809 857','joaquinsilvera69@gmail.com','','Liceo N17 3ro liceo','Montevideo','Cosmos Corinto','','Volante Interior Izquierdo'),
	 ('Tabarez Amerile Ronaldo Nicolas','27/06/2009',58066420,'','','93309099','ronafreefire64@gmail.com','Hospital Policial','2do año, LiceoToledo 2','Montevideo','Peñarol','','Delantero'),
	 ('Tacoronte Estevez Franco Daniel','31/01/2009',57790638,'','092 436 616','099 129 636','francoynacho2018@gmail.com','Cudam','Liceo 38 año 1','Montevideo','','','Lateral Derecho'),
	 ('Woycik Lucas','02/07/2009',59804023,'642599749','26839210','97349413','woyciklucas@gmail.com','Bluecross','British School 2do liceo','San Juan, Puero Rico','Carrasco Polo','','Volante Interior Izquierdo'),
	 ('Acosta Jean','08/01/2008',56967812,'','','','','','','','','','Delantero'),
	 ('Aguirre Joaquin','21/01/2008',57000762,'','47241630','099 041 898?','aguirrejoaquinaxiopolis@gmail.com','COMEPA','Pallotti 3°','Paysandú','Estudiantil','','Volante Interior Derecho');
INSERT INTO public.administrativo ("Jugador","Fecha_Nacimiento","Documento_de_Identidad","Pasaporte","Telefono","Celular","Email","Cobertura_Medica","Estudios","Oriundo","Club_de_Origen","Club_de_Origen_Porcentaje","Posicion") VALUES
	 ('Bais Federico','29/01/2008',57040059,'D350989','23549910','95712086','federicobais16@gmail.com','Círculo Catolico','4to año liceo - Madre Ana','Montevideo','Nacional AUFI','','Volante Interior Izquierdo'),
	 ('Bombaloff Bautista','27/12/2008',57739385,'','','','','','','','','','Defensa Central'),
	 ('Britos Faustino','10/08/2008',NULL,'','','99390833','','','','','','','Volante Interior Izquierdo'),
	 ('Castroman Joaquin','06/02/2008',NULL,'','','99947229','','','','','','','Volante Interior Izquierdo'),
	 ('Codina Lautaro','07/02/2008',57054315,'D001121','','99046701','Lautarocodina1@gmail.com','COSEM','Liceo Pallotti - Año: 3ero de liceo','Montevideo','Nacional AUFI','','Volante Exterior Izquierdo'),
	 ('Costa Federico','23/09/2008',57565691,'','','91026535','fedecosta1899@gmail.com','ASSE','3er año - UTU LC','Artigas','Wanderers Artigas','','Volante Interior Izquierdo'),
	 ('De Oliveira Emiliano','02/01/2008',57521728,'D639876 (Uruguayo)','','95817801','emi9273877@gmail.com','Médica Uruguaya','3er año - UTU LC','Montevideo','Nacional AUFI','','Delantero'),
	 ('Deanes Diaz Tiago Adrián','17/08/2008',57478296,'D647574','','097 772 448','tiagodeanes@gmail.com','ASSE','3er año - UTU Colón','Montevideo','Nacional AUFI','','Arquero'),
	 ('Dos Santos Agustín','09/02/2008',57237553,'','','91022825','','La española','1° de liceo','Salto','Universitario Fc','','Volante Interior Izquierdo'),
	 ('Fernandez Ignacio','11/12/2008',57710662,'','23647453','093 891 056','nachopropro08@gmail.com','Médica uruguaya','Liceo Javier de Viana La Paz,curso 1er año en 2021','Montevideo','Juventud River de la Paz','','Lateral Izquierdo');
INSERT INTO public.administrativo ("Jugador","Fecha_Nacimiento","Documento_de_Identidad","Pasaporte","Telefono","Celular","Email","Cobertura_Medica","Estudios","Oriundo","Club_de_Origen","Club_de_Origen_Porcentaje","Posicion") VALUES
	 ('Garcia Rodrigo','14/01/2008',56977423,'D418995','44567271','96219812','mendezpalacio@hotmail.com','Americano','Colegio Pedro Poveda 3er año','Lascano, Rocha','Danubio de Rocha','','Lateral Derecho'),
	 ('Gonzalez Laureiro Luciano','07/03/2008',57148451,'D375940','22156455','93855230','-','Médica Uruguaya','Liceo 41 - 3er año','Montevideo','Nacional AUFI','','Volante Central'),
	 ('Grunullu Fausto','30/03/2008',57187857,'','','94175283','faustovaq@gmail.com','ASSE','4to año liceo - Colegio Pallotti','Durazno','La Lanera (Durazno)','','Volante Interior Derecho'),
	 ('Hornos Marcelo','23/10/2008',57619230,'','','','','','','','Bella Vista','','Volante Exterior Izquierdo'),
	 ('Hurst Teo','18/09/2008',57544271,'D273253','45545981','99566182','thl18908@gmail.com','CAMEC','1ero de Bachillerato','Nueva Helvecia','Nacional de Nueva Helvecia','','Delantero'),
	 ('Irute Ezequiel','06/01/2008',56954516,'','22968363','95684208','eze06084516@gmail.com','ASSE','Liceo Toledo N°1 - 3ero','Canelones','Nacional AUFI','','Defensa Central'),
	 ('Lauz Joaquín','14/03/2008',57158056,'C936124','26057386','94513174','joaquinlauz08@gmail.com','CRAMI','Colegio San isidro las piedras, tercero de liceo','Montevideo','Nacional AUFI','','Volante Interior Derecho'),
	 ('Lopez Kevin','11/10/2008',57592466,'','','','','','','','','','Arquero'),
	 ('Machin Guzman','14/07/2008',NULL,'','','99114640','','','','','','','Delantero'),
	 ('Martínez Rodrigo','22/03/2008',57169718,'','','99587334','Rm4084789@gmail.com','Hospital ¿?','Liceo 1 Young, 3 año','Young, Río Negro','La Escuelita','','Volante Exterior Derecho');
INSERT INTO public.administrativo ("Jugador","Fecha_Nacimiento","Documento_de_Identidad","Pasaporte","Telefono","Celular","Email","Cobertura_Medica","Estudios","Oriundo","Club_de_Origen","Club_de_Origen_Porcentaje","Posicion") VALUES
	 ('Meny Agustin','18/06/2008',57370311,'','','','','','','','','','Defensa Central'),
	 ('Miglionico Thiago','01/01/2008',57249269,'','47225996','99394168','thiagomiglionico01@gmail.com','Medica Uruguaya','4to año liceo - Pallotti','Paysandú','Amanecer','','Volante Exterior Derecho'),
	 ('Pinto Juan Diego','18/11/2008',57670226,'D300658','26016774','92651110','Juandipinto2008@gmail.com','Medicare','WOODLANDS SCHOOL , Segundo de liceo','Montevideo','Lawn Tennis','','Volante Exterior Derecho'),
	 ('Porcal Lautaro','22/07/2008',57433783,'','43348468','98031087','epf90@hotmail.com','COMECA','Liceo 2 Santa Lucia, 2do año','Santa Lucía, Canelones','Empalme','','Volante Central'),
	 ('Ricca Gayol Roque','10/06/2008',57351331,'D239670','45742753','98042115','roquericca@gmail.com','Mutualista Hospital Evangelico','2° año a definir institución','Tarariras, Colonia','Nacional de Tarariras','','Delantero'),
	 ('Rocca Federico','30/03/2008',57190545,'D068578','22010788','96987569','federocca08@gmail.com','Médica Uruguaya','4to año liceo - Corazón de María','Montevideo','Nacional AUFI','','Lateral Izquierdo'),
	 ('Schaich Alfonso','03/01/2008',57090418,'D247075','26048457','98654545','alfonsoschaich@gmail.con','COSEM','Jesús Maria 3er año ciclo básico','Montevideo','Carrasco Lawn Tennis','','Volante Interior Derecho'),
	 ('Villagrán Alejo','10/02/2008',57058634,'','26824856','91213566','alejovillagran64@gmail.com','Círculo Católico','3ro de liceo - liceo n°8','Florida','Boquita (Sarandí Grande)','','Lateral Izquierdo'),
	 ('Yanes Juan Diego','25/02/2008',57104845,'D275778','43529290','092 798 979','juanyanes019@gmail.com','COMEF','4to año liceo - Liceo n°1 Florida','Florida','Atlético Florida','','Defensa Central'),
	 ('Alonso Martínez Enzo','28/01/2010',58382921,'','-','98029653','enzoalonso2801@gmail.com','La Asistencial Médica','9no, comienzo en Liceo Pedro Poveda','Maldonado','','','Volante Central');
INSERT INTO public.administrativo ("Jugador","Fecha_Nacimiento","Documento_de_Identidad","Pasaporte","Telefono","Celular","Email","Cobertura_Medica","Estudios","Oriundo","Club_de_Origen","Club_de_Origen_Porcentaje","Posicion") VALUES
	 ('Alvarez Marín Marcos Benjamín','16/10/2010',58793233,'','','094 825 348','benjaminalvarez20101016@gmail.com','Medica Uruguaya','Pinar 2 2do','Ciudad de la Costa','','','Volante Exterior Derecho'),
	 ('Chagas Lopez Hugo Nahuel','15/05/2010',58553083,'D605550','46330153','92908928','chagashugo155@gmail.com','COMTA/FEMI','2do año - colegio Pallotti','Tacuarembo','','','Defensa Central'),
	 ('Coccoli Thiago','02/06/2010',58582602,'','22271365','097 115 555','Luciaco1990@gmail.com','ASSE','Segundo de liceo(liceo 45)','Montevideo','','','Lateral Derecho'),
	 ('Farias Fernandez Johel','16/09/2010',58744232,'','23207094','95932584','alejandrafer364@gmail.com','Circulo catolico','2do de liceo','Montevideo','','','Lateral Izquierdo'),
	 ('Fernandez Thiago','15/05/2010',58560595,'','-','96584774','thiagofernandezS@gmail.com','Médica Uruguaya','','Montevideo','','','Defensa Central'),
	 ('Ferreira Lopez Juan Martin','22/06/2010',58610865,'','-','092 342 561','juanchiferreiralopez@gmail.com','Comeca','Liceo nstra Señora de Guadalupe, Canelones','Canelones','','','Lateral Derecho'),
	 ('Fredo Cavani Mateo Sebastian','13/05/2010',58549595,'Si','-','92538943','matteofredo22@gmail.com','ASSE','Liceo N°4 cursó 7mo.','Paysandú','','','Volante Exterior Derecho'),
	 ('Garcia Costa Mauro','12/03/2010',58452247,'Si','43172905','99492860','sole301080@hotmail.com','Medica Uruguaya','Comienzo 9o liceo de Migues','Migues','','','Volante Interior Izquierdo'),
	 ('Garcia Rivero Ignacio','30/05/2010',58867931,'','47350906','99739323','nachogarriv@gmail.com','Centro médico de Salto (CAM)','8vo año Palloti','Salto','','','Volante Interior Izquierdo'),
	 ('Gonzalez Nicolas','06/05/2010',58557346,'','-','93927783','nicogonz0610@gmail.com','sociedad médica universal','Liceo libano','Montevideo','','','Volante Exterior Derecho');
INSERT INTO public.administrativo ("Jugador","Fecha_Nacimiento","Documento_de_Identidad","Pasaporte","Telefono","Celular","Email","Cobertura_Medica","Estudios","Oriundo","Club_de_Origen","Club_de_Origen_Porcentaje","Posicion") VALUES
	 ('Guedes Castillo Facundo Ezequiel','03/03/2010',58479928,'','-','091 806 366','facundoguedes18@gmail.com','Medica Uruguaya','liceo 1 de toledo noveno','Toledo','','','Volante Interior Izquierdo'),
	 ('Gutierrez Ramirez Enzo Nahuel','27/02/2010',58428662,'','-','95480150','enzogutierrez102@gmail.com','ASSE','Segundo de liceo','Montevideo','','','Volante Interior Derecho'),
	 ('Hernandez Beltran Ignacio Bautista','24/01/2010',58376043,'-','-','92275811','ignaciobautistahernandez2010@gmail.com','IAC','Escuela técnica 2, tercero','Treinta y Tres','','','Volante Interior Derecho'),
	 ('Inthamoussu Tomas','03/02/2010',58389941,'D018858','26228731','96390870','tomas.intha@gmail.com','Médica Uruguaya','Liceo a definir(febrero) 3°','Montevideo','','','Defensa Central'),
	 ('Lazo Umpierrez Juan Felipe','06/09/2010',58726604,'','22189289','92203823','villafeli11@gmail.com','Asociación Española','Liceo 12, 2do','Montevideo','','','Defensa Central'),
	 ('Ledesma Puerto Thiago Xavier','01/02/2010',58432633,'','-','94211330','Thiagoledesmabolso09@gmail.com','GREMCA','Liceo 42, 3ro de liceo','Montevideo','','','Volante Exterior Derecho'),
	 ('Machin Trindade Luis Eduardo','06/02/2010',58398605,'','-','098 342 250?','luismachin2010@icloud.com','Casmu','Noveno (utu)','Montevideo','','','Arquero'),
	 ('Maurente Rodrigo','03/03/2010',58481907,'','22276636','96514251','','ASSE','Liceo 65. 3 año de liceo','Montevideo','','','Volante Interior Derecho'),
	 ('Mederos Begle Fabricio','17/04/2010',58510697,'D030748','-','99189904','fabriciomederos1710@gmail.com','Camec - americano','Colegio y liceo pallotti, 9no - tercer año','Nueva Helvecia','','','Volante Exterior Derecho'),
	 ('Miller Traversa Emiliano David','12/04/2010',58501234,'','4734 2101','99171625','emimiller007@gmail.com','Centro de Asistencia Médica de Salto CAM','Colegio Palloti, 3ro de Liceo(Noveno)','Salto','','','Defensa Central');
INSERT INTO public.administrativo ("Jugador","Fecha_Nacimiento","Documento_de_Identidad","Pasaporte","Telefono","Celular","Email","Cobertura_Medica","Estudios","Oriundo","Club_de_Origen","Club_de_Origen_Porcentaje","Posicion") VALUES
	 ('Morales Gmur Sebastian Ilich','31/05/2010',58578675,'D407061','-','94969366','agmur@uas.edu.uy','SMI','Liceo N*2 Salinas. Cursando segundo año.','Montevideo','','','Volante Exterior Derecho'),
	 ('Naya Dufrechou Francisco','04/05/2010',58534796,'','26984802','91648900','darioalejandronaya@gmail.com','Hospital Evangélico','8vo grado. Colegio La Amistad','Montevideo','','','Defensa Central'),
	 ('Nogueira Buergues Guillermo','16/05/2010',58555724,'','-','97909798','Guillermonogueira6@gmail.com','','Liceo shangrila 1er año aprobado','Canelones','','','Volante Interior Derecho'),
	 ('Pezzani Lorenzo','24/01/2010',58897617,'','26280244','098 747 647','Lolopezzani@gmail.com','COSEM','Saint Brendan''s School 3ero de liceo','Dallas','','','Arquero'),
	 ('Piñeyro Santino','19/10/2010',58796166,'','-','091 509 622','santinopineyro642@gmail.com','Hospital Evangélico','Utu union segundo','Montevideo','','','Volante Interior Izquierdo'),
	 ('Quartiani Facundo','22/02/2010',58419986,'SI','','095 721 391','silvamicaeela292@gmail.com','Medica Uruguaya','liceo 62 3ero de liceo','Montevideo','','','Volante Central'),
	 ('Ramirez Luis','12/03/2010',58450368,'','-','97553306','vivianarussi2023@gmail.com','Universal','Segundo de liceo ( liceo Montevideo )','Montevideo','','','Volante Exterior Derecho'),
	 ('Ramos Invernizzi Ignacio','24/01/2024',58354635,'C901555','-','094 283 038','cucuramos.2010@gmail.com','Asociación Española','Liceo n°20 9no','Montevideo','','','Defensa Central'),
	 ('Rios Ferreria Emiliano','25/10/2010',58804602,'','47722149','091 807 846?','jessicafl18@gmail.con','Gremeda femi','Liceo n3 de Artigas, promovido a Oactavo año','Artigas','','','Volante Interior Derecho'),
	 ('Rodella Dante','05/03/2010',58441820,'','-','97391312','danterodella25@gmail.com','COSEM','segundo año, utu de la teja','Montevideo','','','Lateral Izquierdo');
INSERT INTO public.administrativo ("Jugador","Fecha_Nacimiento","Documento_de_Identidad","Pasaporte","Telefono","Celular","Email","Cobertura_Medica","Estudios","Oriundo","Club_de_Origen","Club_de_Origen_Porcentaje","Posicion") VALUES
	 ('Rodriguez Kevin','02/01/2010',58529339,'-','-','99425000','kevinlaureiro60@gmail.com','Asociación Española','Colegio Pallotti - noveno','Montevideo','','','Delantero'),
	 ('Rodríguez Terra Juan Ignacio','28/01/2010',58381472,'D644618','43741104','98479159','juanirodriguezterra7@gmail.com','Medica Uruguaya','Noveno año','Montevideo','','','Lateral Derecho'),
	 ('Ruiz Gómez Emilio Gastón','27/02/2010',58429252,'','-','99558471','miangel29121989@hotmail.com','Camedur','Liceo Doctor Francisco Ríos, 9° año','','Nacional Sarandi del Yi','','Volante Exterior Izquierdo'),
	 ('Saravia Torres Francisco','22/12/2010',58891920,'','462 31893','99380655','Saraviafrancisco364@gmail.com','Casmer(América)','Segundo de liceo colegio palloti','Rivera','','','Arquero'),
	 ('Sosa Benjamin','19/01/2010',58368004,'-','-','91260797','-','Comero','Liceo Cebollatí, tercero','Cebollati','','','Volante Exterior Izquierdo'),
	 ('Tapia Fernández Lautaro Nicolás','25/08/2010',58708537,'','43362225','93338274','lautaronicolastapia2010@gmail.com','Comeca','Liceo Los Cerrillos, año 8vo','Canelones','','','Delantero'),
	 ('Acosta Facundo','15/04/2006',55862728,'','','94677431','facundoacosta.conve10@gmail.com','','','','','','Lateral Izquierdo'),
	 ('Bianchi Juan Felipe','16/02/2006',55865247,'D615965','44525072','094 753 337','richtoffencod@gmail.com','Sanatorio Americano','6to año liceo - Liceo Zorrilla','Treinta y Tres','Club Atlético Huracán','','Arquero'),
	 ('Bonilla Federico','08/12/2005',55733191,'','43132432','91631036','fedebonilla12@gmail.com','COMECA','Liceo "Dr. Juan Maria Falero"- 4to año','Santa Rosa, Canelones','Club Atlético Ideal','','Arquero'),
	 ('Brener Francisco','26/02/2006',56511586,'','','94446317','Franciscobrener39@gmail.com','COMECA','5to año liceo - Liceo n°1 Canelones','Canelones','Club atletico Barrio sur Canelones','','Volante Exterior Izquierdo');
INSERT INTO public.administrativo ("Jugador","Fecha_Nacimiento","Documento_de_Identidad","Pasaporte","Telefono","Celular","Email","Cobertura_Medica","Estudios","Oriundo","Club_de_Origen","Club_de_Origen_Porcentaje","Posicion") VALUES
	 ('Calione Paolo','22/05/2006',55930632,'D393463','4332 8389','94632937','paolocalione@gmail.com','COMECA','5to año liceo - Liceo Tomas Berreta','Canelones','Club Social Deportivo y Católico Fátima','','Defensa Central'),
	 ('Cuadro Navarro Alexis Ezequiel','07/02/2006',55666667,'','2314 1333','97082403','cuadro7206@gmail.com','Hospital Militar','Area Comunitaria, 1ro','Montevideo','COVICENOVA','','Volante Central'),
	 ('Dalmas Jonathan','22/06/2006',55962093,'','','98447568','','Asociación Española','Pedro Poveda, Curso 2 año','Dolores, Soriano','Bella Vista','','Volante Interior Derecho'),
	 ('Del Pino Emiliano','28/04/2006',56656267,'','','92399023','emilianodelpino23@gmail.com','Salud Publica','','Montevideo','','','Delantero'),
	 ('Echeverria Juan Pedro','14/05/2006',56618702,'D169449','26006742','92559588','jope.echeverria@gmail.com','MP','British Schools 3er año','Montevideo','Euskalerria','','Lateral Izquierdo'),
	 ('Espinosa Ferreira Santiago','10/10/2006',56241307,'','4352 5150','91787672','sanespino20@gmail.com','COMEF','Liceo N*1 IMO','Florida','Nacional de Florida','','Defensa Central'),
	 ('Garcia Juan Ignacio','25/06/2006',56397596,'YB7832095 // D490870 - vence 20/08/2031','23654800','98622060','Juaaaaanigl9@gmail.com','CRAMI','San Isidro 3er año de liceo','Las Piedras, Canelones','Cultural Florida','','Defensa Central'),
	 ('Gimenez Pintos Agustin','09/04/2006',55780150,'','-','97352751','55780150ag@gmail.com','','Facultad de Medicina, primer año','Florida','Candil','','Arquero'),
	 ('Lopez Nahuel','24/01/2007',56763107,'No','','98534352','Nahuellopes@gmail com','CAMCEL','Palotti , 1er año','Melo, Cerro Largo','Wanderers de Melo','','Volante Creativo'),
	 ('Martino Emiliano','05/09/2006',56062375,'D141307','43324243','92553180','sdamiano@adinet.com.uy','COMECA','Liceo Tomás Berreta Canelones 6to año Economía','Canelones','CA Libertad','','Defensa Central');
INSERT INTO public.administrativo ("Jugador","Fecha_Nacimiento","Documento_de_Identidad","Pasaporte","Telefono","Celular","Email","Cobertura_Medica","Estudios","Oriundo","Club_de_Origen","Club_de_Origen_Porcentaje","Posicion") VALUES
	 ('Nuñez Pavel','02/04/2006',55645491,'','','93459252','pavelbr2021@gmail.com','Hospital Militar','5to año','Colonia','El General','','Delantero'),
	 ('Pedrouzo Federico','07/03/2006',NULL,'','','91895660','','','','','','','Defensa Central'),
	 ('Petit Gonzalo','21/09/2006',56304995,'C659346','4542 2623','91509969','gonzalopetit19@gmail.com','CAMOC','Pallotti 3 año','Carmelo, Colonia','Artigas FC','','Delantero'),
	 ('Piriz Ezequiel','16/07/2006',55913274,'','','94820581','','CUDAM','','Montevideo','','','Lateral Derecho'),
	 ('Quinteros Brian','22/01/2005',55203788,'','','91260785','quinterosbrian39@gmail.com','','5° Humanístico','Artigas','Progreso','','Volante Central'),
	 ('Riccetto Ladereche Juan Andres','01/12/2005',55696365,'','','99525499','juanchiriccetto1011@gmail.com','ASSE','6to año medicina','Artigas','San Eugenio','','Volante Exterior Derecho'),
	 ('Rijo Tiago','14/06/2005',56154231,'','','91613742','','FONASA','Colegio Pedro Poveda, curso 2 año','Fray Marcos, Florida','Atlético Fray Marcos','','Volante Exterior Derecho'),
	 ('Rolando Mauro','24/02/2006',56600456,'','','94297837','','Medica Uruguaya','','Canelones','','','Lateral Derecho'),
	 ('Sanchez Aranda Benjamín','08/05/2005',55635432,'','','99243659','','Médica Uruguaya','1ro liceo','Paysandú','Defensor Sporting','','Volante Exterior Izquierdo'),
	 ('Vazquez Lautaro','01/01/2006',56491635,'','','','','','','','','','Lateral Derecho');
INSERT INTO public.administrativo ("Jugador","Fecha_Nacimiento","Documento_de_Identidad","Pasaporte","Telefono","Celular","Email","Cobertura_Medica","Estudios","Oriundo","Club_de_Origen","Club_de_Origen_Porcentaje","Posicion") VALUES
	 ('Viera Tomas','18/03/2006',56177712,'','45524934','92368416','Tomy.viera@icloud.com','Asociación Española','Colegio Liceo Pallotti - 4 año','Montevideo','Nacional de Nueva Helvecia','','Defensa Central'),
	 ('Vitor Joao','04/07/2006',0,'','','','','','','','','','Volante Central'),
	 ('Amaral Axell','14/02/2007',56879918,'','','95519865','axellamaral0@gmail.com','Asociación Española','3er año',' Colegio Pallotti','Cerro Largo','Melo Wanderers',''),
	 ('Arady Bruno','01/07/2007',56845349,'','','93984127','danar.72@hotmail.com','MP','Jesus Maria 2do año de liceo','Montevideo','Nuevo Juventud','','Volante Exterior Izquierdo'),
	 ('Bazzano Misael','03/01/2007',56303010,'','','','','','','','','','Mediapunta'),
	 ('Borges Tapia Facundo Ivanovich','12/05/2007',56580016,'','','91854885','ivanso2011@hotmail.com','Médica Uruguaya','Segundo año ciclo básico',' Liceo 24','Melo',' Cerro Largo','Club La Cuchilla'),
	 ('Cabrera Ignacio','12/05/2007',56530613,'','23140549','92989818','Nachooocabreraa5@gmail.com','CASMU','Liceo 11 Bruno Mauricio de Zabala 2do','','Nuevo Juventud','','Lateral Derecho'),
	 ('Clematte Román','06/09/2007',56794752,'','','95452572','paulclematte19@gmail.com','Medica Uruguaya','2do Año de UTU','Montevideo','Santa Catalina','','Defensa Central'),
	 ('Denis Juan Francisco','01/01/2007',56285690,'','','92034515','juanfranciscodeniseli@gmail.com','IAC','Palloti','3ero de ciclo básico','Treinta y Tres','Yerbalito',''),
	 ('Domínguez Facundo','15/07/2007',56837413,'','23376277','92919925','elpepe1705@hotmail.com','ASSE','Pallotti 2do año','Montevideo','Wanderers','','Delantero');
INSERT INTO public.administrativo ("Jugador","Fecha_Nacimiento","Documento_de_Identidad","Pasaporte","Telefono","Celular","Email","Cobertura_Medica","Estudios","Oriundo","Club_de_Origen","Club_de_Origen_Porcentaje","Posicion") VALUES
	 ('Espalter Rodrigo','23/02/2007',56920163,'','','98795047','royespalter@gmail.com','Asociación Española','Pallotti Tercer Año','Fray Bentos','Fray Bentos','','Volante Exterior Derecho'),
	 ('Fregueiro Bruno','07/06/2007',56809729,'','','091463805@gmail.com','Fregueirobruno@gmail.com','Sanatorio Americano','2° Pallotti','Treinta y Tres','Yerbalito','','Lateral Izquierdo'),
	 ('García Martín','26/03/2007',56521830,'','26814442','97500148','martingarciajunior07@gmail.com','SMI','5to año de liceo - Liceo Shangrila','Montevideo','Nacional AUFI','','Arquero'),
	 ('Gauthier Gaston','05/04/2007',56465955,'','','','','','','','','','Arquero'),
	 ('González Santiago','04/10/2007',56784555,'','','','','','','','','','Arquero'),
	 ('Iliaria Gianluca','19/02/2007',56413479,'D217413','24008525','92559071','gilaria2007@gmail.com','Circulo catolico','IAVA 5to año bachillerato','Montevideo','Bella Vista','30','00%'),
	 ('Martinez Anderson','28/04/2007',571616830,'','-','092 291 461?','-','ASSE','Pase para 3 año','Artigas','Independencia Artigas','','Volante Exterior Izquierdo'),
	 ('Martínez Mauro','19/01/2007',56364329,'','25110392','97407822','mauromartinez192007@gmail.com','ASSE','5to año de liceo - Liceo Damaso','Montevideo','7 estrellas','','Volante Central'),
	 ('Milano Mauricio','01/03/2007',56740002,'','230921632','94886865','mauriciomilanobertiz@gmail.com','CASMU','Mariano 2do','Montevideo','Carlitos Prado','','Volante Central'),
	 ('Montaos Luciano','09/02/2007',56630461,'D226280','23237295','93306828','lucianomontaos2018@gmail.com','CUDAM','3° Liceo 74','Montevideo','Independiente Lezica','','Lateral Izquierdo');
INSERT INTO public.administrativo ("Jugador","Fecha_Nacimiento","Documento_de_Identidad","Pasaporte","Telefono","Celular","Email","Cobertura_Medica","Estudios","Oriundo","Club_de_Origen","Club_de_Origen_Porcentaje","Posicion") VALUES
	 ('Montes de Oca Sebastián','30/07/2007',56740632,'','26243711','92271106','Sebaeloonce@gmail.com','SMI','Logosófico 2do año','Montevideo','Rayo Rojo','','Volante Exterior Derecho'),
	 ('Morales Lautaro','10/07/2007',56658384,'','22274601','96323265','titimoralitobolso@gmail.com','Hospital Militar','2° Liceo 25','Montevideo','Nacional AUFI','','Volante Central'),
	 ('Mysznajes Sebastían','24/03/2007',56542482,'D313179','','98510588','sebasmysz@gmail.com','Hospital Británico','Pallotti 3er año','Montevideo','Uruguay Buceo','','Defensa Central'),
	 ('Oliva Gonzalo','29/05/2007',56676213,'D203264','23473568','91434605','Gonzalooliva007@gmail.com','GREMCA','2° San José de la Providencia','Montevideo','Nuevo Juventud','','Volante Central'),
	 ('Perez Octavio','28/11/2007',57113822,'','','','','','','','','','Volante Central'),
	 ('Ricca Santiago','03/11/2007',56935439,'','','','','','','','','','Delantero'),
	 ('Rodríguez Luciano','15/03/2007',56382838,'','22271916','97684807','lucianoemanuelrodriguezborges@gmail.com','MSP','Liceo 67 Cursando Tercero','Montevideo','Estrella De Oro','','Defensa Central'),
	 ('Soria Mateo','14/03/2007',56496027,'','23039748','95584104','Juliapalaveper@gmail.com','Médica Uruguaya','3er año en liceo n°66 Parque tejano','Montevideo','Nuevo Juventud','','Volante Central'),
	 ('Trucido Guzman','14/03/2007',56451439,'','44728861','91904814','guzmandanu14@gmail.com','Asociacion Española','5to año Pallotti','Rocha','Rocha FC','30','00%'),
	 ('Abreu Mateo','02/03/2009',57843728,'','23660573','93407996','mateoabreu009@gmail.com','CRAMI','3er año liceo - Liceo n°2 German Cabrera','Las Piedras','Nacional AUFI','','Volante Interior Derecho');
INSERT INTO public.administrativo ("Jugador","Fecha_Nacimiento","Documento_de_Identidad","Pasaporte","Telefono","Celular","Email","Cobertura_Medica","Estudios","Oriundo","Club_de_Origen","Club_de_Origen_Porcentaje","Posicion") VALUES
	 ('Aguilera Sánchez Alexis Sebastián','25/02/2009',57833866,'','','95938501','jaimealexis127@gmail.com','CRAMI','2do de liceo','Las Piedras','San Luis (las piedras)','','Volante Exterior Derecho'),
	 ('Amaro Thiago','11/04/2009',57910008,'','23137023','96478178','losmolisson3@gmail.com','Circulo catolico','3ro liceo, n°11','Montevideo','Zorzal Baby Fútbol','','Lateral Derecho'),
	 ('Barrera Acosta Benjamín Rodrigo','30/04/2009',57974795,'','','95786081','benja120056@gmail.com','HCFFAA','3ro de liceo, n°62','Montevideo','Nacional AUFI','','Volante Interior Derecho'),
	 ('Benítez Cardozo Anderson Josué','22/01/2009',57776551,'','','091 793 098','elchiky260186@gmail.com','ASSE','2do de liceo','Toledo','Siete Estrellas','','Volante Exterior Derecho'),
	 ('Berguncio Roascio Mateo','11/09/2009',58162595,'','','091 577 614','mateoberguncio@gmail.com','CAM','2do de liceo','Salto','Ferrocarril','','Volante Exterior Derecho'),
	 ('Bueno Olivera Bruno Leonardo','03/01/2009',57853618,'','','092 028 954','alebrabru@gmail.com','ASSE','2do de liceo','Artigas','Nacional (Artigas)','','Volante Central'),
	 ('Caraballo Ortiz Gianluca Genaro','11/05/2009',57997715,'','','98043112','alaniscaraballo14@gmail.com','ASSE','De. Medulio Pérez Fontana (Nueva Palmira)','Carmelo','Club deportivo sacachispas','','Arquero'),
	 ('Chiesa Carluccio Agustin','28/03/2009',57890709,'','43455874','98066399','chiesaagustin22@gmail.com','Asociacion Española','Colegio San José , 3er año','Montevideo','Club Atlético Juventud Unida','','Volante Interior Derecho'),
	 ('De Leon Felipe','20/04/2009',57930628,'','43152019','99457559','felipedeleonphi@gmail.com','Comeca','Liceo José Alonso y Trelles 3er año','Tala','Atenas de Tala','','Volante Interior Izquierdo'),
	 ('Gancheff Juan Pablo','20/04/2009',57936581,'','43133527','092 200 165','gancheffjuampi@gmail.com','COMECA','Liceo Santa Rosa( Loreto Daniel vidart) 3er año','Canelones','Unión baby fútbol','','Volante Exterior Izquierdo');
INSERT INTO public.administrativo ("Jugador","Fecha_Nacimiento","Documento_de_Identidad","Pasaporte","Telefono","Celular","Email","Cobertura_Medica","Estudios","Oriundo","Club_de_Origen","Club_de_Origen_Porcentaje","Posicion") VALUES
	 ('García Ruiz Ramiro','06/06/2009',58007062,'C891494','45522831','98338221','ramigarcia0606@gmail.com','Camec','2do de liceo','Rosario','Rosario Atletico','','Volante Central'),
	 ('Grudzien Tomas','21/05/2009',57981558,'D367975','26017274','98647903','tomasgrudzien2009@gmail.com','Seguro Americano','2do de liceo St.Patricks','Montevideo','Náutico Rojo','','Lateral Derecho'),
	 ('Jaime Parceriza Manuel Andrés','20/09/2009',58286486,'','43133506','93479424','parcerizanatalia@gmail.com','ASSE','2do de liceo','Santa Rosa','Union Santa Rosa','','Volante Interior Derecho'),
	 ('Laureiro Correa Santiago Emanuel','14/01/2009',57832840,'','43760929','97465236','santiagolaureiro10@gmail.com','Casmu','3er año liceo','Quito, Ecuador','Neptunia','','Volante Exterior Derecho'),
	 ('Márquez de Lima Álvarez Juan Andrés','09/12/2009',58308181,'','','92308778','noeliaalv_29@hotmail.com','MUCAM','2do de liceo','Cerro Chato','River FC','','Volante Exterior Derecho'),
	 ('Matonte Santiago','22/05/2009',57986956,'','','92757954','santiagomatonte34@gmail.com','Comeflo','2do de liceo','Trinidad','Porongos','','Volante Interior Izquierdo'),
	 ('Milesi Fausto','07/04/2009',61863760,'YB5874531','26829502','97133163','Fausto.Milesi.18@gmail.com','Blue Cross','The British Schools 2do liceo','Beijing, China','Carrasco Polo','','Volante Exterior Derecho'),
	 ('Moreira Ibarra Luis Felipe','12/08/2009',58325066,'D 617162','27072148','91435344','pelocha31@hotmail.com','MP','San Juan Bautista 2do liceo','Barranquilla, Colombia','Enrique Lopez','','Lateral Izquierdo'),
	 ('Muñiz Larrauri Lautaro','26/03/2009',57887099,'','43648572','99455231','munizlautaro464@gmail.com','','3ro de liceo Pallotti','Flores','Nacional (Trinidad)','','Defensa Central'),
	 ('Perez Chapitel Fernando Ezequiel','17/04/2009',57919816,'','46240145','91257536','fernandowtf09@gmail.com','Casmer','3er año liceo','Rivera','Huracan (Rivera)','','Volante Exterior Derecho');
INSERT INTO public.administrativo ("Jugador","Fecha_Nacimiento","Documento_de_Identidad","Pasaporte","Telefono","Celular","Email","Cobertura_Medica","Estudios","Oriundo","Club_de_Origen","Club_de_Origen_Porcentaje","Posicion") VALUES
	 ('Robotti Kalo','07/01/2009',57750250,'','27162070','96220002','kalorobotti@gmail.com','Impasa','San Juan Bautista 3ro liceo','Montevideo','Estrella del sur','','Volante Exterior Derecho'),
	 ('Rodriguez Zinola Santino Alejandro','15/01/2009',57766291,'','','092 835 765','santizinola@gmail.com','CAMEPA','liceo 1 de pando, tercer año','Pando','Atlanta de Pando','','Defensa Central'),
	 ('Saldaña Marin Facundo Nicolás','04/04/2009',57925227,'','47726262','99538152','juanmariafacu@gmail.com','ASSE','2do de liceo','Artigas','Nacional (Artigas)','','Volante Exterior Izquierdo'),
	 ('Santana Britos Teylonn Daniel','23/01/2009',57853680,'','47793541','92471332','teylonnbritos@gmail.com','Hospital Militar','Ciclo básico utu sauce 3er año','Sauce','','','Volante Interior Izquierdo'),
	 ('Silvera González Joaquín Luciano','14/03/2009',57864176,'','','094 809 857','joaquinsilvera69@gmail.com','','Liceo N17 3ro liceo','Montevideo','Cosmos Corinto','','Volante Interior Izquierdo'),
	 ('Tabarez Amerile Ronaldo Nicolas','27/06/2009',58066420,'','','93309099','ronafreefire64@gmail.com','Hospital Policial','2do año, LiceoToledo 2','Montevideo','Peñarol','','Delantero'),
	 ('Tacoronte Estevez Franco Daniel','31/01/2009',57790638,'','092 436 616','099 129 636','francoynacho2018@gmail.com','Cudam','Liceo 38 año 1','Montevideo','','','Lateral Derecho'),
	 ('Woycik Lucas','02/07/2009',59804023,'642599749','26839210','97349413','woyciklucas@gmail.com','Bluecross','British School 2do liceo','San Juan, Puero Rico','Carrasco Polo','','Volante Interior Izquierdo'),
	 ('Acosta Jean','08/01/2008',56967812,'','','','','','','','','','Delantero'),
	 ('Aguirre Joaquin','21/01/2008',57000762,'','47241630','099 041 898?','aguirrejoaquinaxiopolis@gmail.com','COMEPA','Pallotti 3°','Paysandú','Estudiantil','','Volante Interior Derecho');
INSERT INTO public.administrativo ("Jugador","Fecha_Nacimiento","Documento_de_Identidad","Pasaporte","Telefono","Celular","Email","Cobertura_Medica","Estudios","Oriundo","Club_de_Origen","Club_de_Origen_Porcentaje","Posicion") VALUES
	 ('Bais Federico','29/01/2008',57040059,'D350989','23549910','95712086','federicobais16@gmail.com','Círculo Catolico','4to año liceo - Madre Ana','Montevideo','Nacional AUFI','','Volante Interior Izquierdo'),
	 ('Bombaloff Bautista','27/12/2008',57739385,'','','','','','','','','','Defensa Central'),
	 ('Britos Faustino','10/08/2008',NULL,'','','99390833','','','','','','','Volante Interior Izquierdo'),
	 ('Castroman Joaquin','06/02/2008',NULL,'','','99947229','','','','','','','Volante Interior Izquierdo'),
	 ('Codina Lautaro','07/02/2008',57054315,'D001121','','99046701','Lautarocodina1@gmail.com','COSEM','Liceo Pallotti - Año: 3ero de liceo','Montevideo','Nacional AUFI','','Volante Exterior Izquierdo'),
	 ('Costa Federico','23/09/2008',57565691,'','','91026535','fedecosta1899@gmail.com','ASSE','3er año - UTU LC','Artigas','Wanderers Artigas','','Volante Interior Izquierdo'),
	 ('De Oliveira Emiliano','02/01/2008',57521728,'D639876 (Uruguayo)','','95817801','emi9273877@gmail.com','Médica Uruguaya','3er año - UTU LC','Montevideo','Nacional AUFI','','Delantero'),
	 ('Deanes Diaz Tiago Adrián','17/08/2008',57478296,'D647574','','097 772 448','tiagodeanes@gmail.com','ASSE','3er año - UTU Colón','Montevideo','Nacional AUFI','','Arquero'),
	 ('Dos Santos Agustín','09/02/2008',57237553,'','','91022825','','La española','1° de liceo','Salto','Universitario Fc','','Volante Interior Izquierdo'),
	 ('Fernandez Ignacio','11/12/2008',57710662,'','23647453','093 891 056','nachopropro08@gmail.com','Médica uruguaya','Liceo Javier de Viana La Paz,curso 1er año en 2021','Montevideo','Juventud River de la Paz','','Lateral Izquierdo');
INSERT INTO public.administrativo ("Jugador","Fecha_Nacimiento","Documento_de_Identidad","Pasaporte","Telefono","Celular","Email","Cobertura_Medica","Estudios","Oriundo","Club_de_Origen","Club_de_Origen_Porcentaje","Posicion") VALUES
	 ('Garcia Rodrigo','14/01/2008',56977423,'D418995','44567271','96219812','mendezpalacio@hotmail.com','Americano','Colegio Pedro Poveda 3er año','Lascano, Rocha','Danubio de Rocha','','Lateral Derecho'),
	 ('Gonzalez Laureiro Luciano','07/03/2008',57148451,'D375940','22156455','93855230','-','Médica Uruguaya','Liceo 41 - 3er año','Montevideo','Nacional AUFI','','Volante Central'),
	 ('Grunullu Fausto','30/03/2008',57187857,'','','94175283','faustovaq@gmail.com','ASSE','4to año liceo - Colegio Pallotti','Durazno','La Lanera (Durazno)','','Volante Interior Derecho'),
	 ('Hornos Marcelo','23/10/2008',57619230,'','','','','','','','Bella Vista','','Volante Exterior Izquierdo'),
	 ('Hurst Teo','18/09/2008',57544271,'D273253','45545981','99566182','thl18908@gmail.com','CAMEC','1ero de Bachillerato','Nueva Helvecia','Nacional de Nueva Helvecia','','Delantero'),
	 ('Irute Ezequiel','06/01/2008',56954516,'','22968363','95684208','eze06084516@gmail.com','ASSE','Liceo Toledo N°1 - 3ero','Canelones','Nacional AUFI','','Defensa Central'),
	 ('Lauz Joaquín','14/03/2008',57158056,'C936124','26057386','94513174','joaquinlauz08@gmail.com','CRAMI','Colegio San isidro las piedras, tercero de liceo','Montevideo','Nacional AUFI','','Volante Interior Derecho'),
	 ('Lopez Kevin','11/10/2008',57592466,'','','','','','','','','','Arquero'),
	 ('Machin Guzman','14/07/2008',NULL,'','','99114640','','','','','','','Delantero'),
	 ('Martínez Rodrigo','22/03/2008',57169718,'','','99587334','Rm4084789@gmail.com','Hospital ¿?','Liceo 1 Young, 3 año','Young, Río Negro','La Escuelita','','Volante Exterior Derecho');
INSERT INTO public.administrativo ("Jugador","Fecha_Nacimiento","Documento_de_Identidad","Pasaporte","Telefono","Celular","Email","Cobertura_Medica","Estudios","Oriundo","Club_de_Origen","Club_de_Origen_Porcentaje","Posicion") VALUES
	 ('Meny Agustin','18/06/2008',57370311,'','','','','','','','','','Defensa Central'),
	 ('Miglionico Thiago','01/01/2008',57249269,'','47225996','99394168','thiagomiglionico01@gmail.com','Medica Uruguaya','4to año liceo - Pallotti','Paysandú','Amanecer','','Volante Exterior Derecho'),
	 ('Pinto Juan Diego','18/11/2008',57670226,'D300658','26016774','92651110','Juandipinto2008@gmail.com','Medicare','WOODLANDS SCHOOL , Segundo de liceo','Montevideo','Lawn Tennis','','Volante Exterior Derecho'),
	 ('Porcal Lautaro','22/07/2008',57433783,'','43348468','98031087','epf90@hotmail.com','COMECA','Liceo 2 Santa Lucia, 2do año','Santa Lucía, Canelones','Empalme','','Volante Central'),
	 ('Ricca Gayol Roque','10/06/2008',57351331,'D239670','45742753','98042115','roquericca@gmail.com','Mutualista Hospital Evangelico','2° año a definir institución','Tarariras, Colonia','Nacional de Tarariras','','Delantero'),
	 ('Rocca Federico','30/03/2008',57190545,'D068578','22010788','96987569','federocca08@gmail.com','Médica Uruguaya','4to año liceo - Corazón de María','Montevideo','Nacional AUFI','','Lateral Izquierdo'),
	 ('Schaich Alfonso','03/01/2008',57090418,'D247075','26048457','98654545','alfonsoschaich@gmail.con','COSEM','Jesús Maria 3er año ciclo básico','Montevideo','Carrasco Lawn Tennis','','Volante Interior Derecho'),
	 ('Villagrán Alejo','10/02/2008',57058634,'','26824856','91213566','alejovillagran64@gmail.com','Círculo Católico','3ro de liceo - liceo n°8','Florida','Boquita (Sarandí Grande)','','Lateral Izquierdo'),
	 ('Yanes Juan Diego','25/02/2008',57104845,'D275778','43529290','092 798 979','juanyanes019@gmail.com','COMEF','4to año liceo - Liceo n°1 Florida','Florida','Atlético Florida','','Defensa Central'),
	 ('Alonso Martínez Enzo','28/01/2010',58382921,'','-','98029653','enzoalonso2801@gmail.com','La Asistencial Médica','9no, comienzo en Liceo Pedro Poveda','Maldonado','','','Volante Central');
INSERT INTO public.administrativo ("Jugador","Fecha_Nacimiento","Documento_de_Identidad","Pasaporte","Telefono","Celular","Email","Cobertura_Medica","Estudios","Oriundo","Club_de_Origen","Club_de_Origen_Porcentaje","Posicion") VALUES
	 ('Alvarez Marín Marcos Benjamín','16/10/2010',58793233,'','','094 825 348','benjaminalvarez20101016@gmail.com','Medica Uruguaya','Pinar 2 2do','Ciudad de la Costa','','','Volante Exterior Derecho'),
	 ('Chagas Lopez Hugo Nahuel','15/05/2010',58553083,'D605550','46330153','92908928','chagashugo155@gmail.com','COMTA/FEMI','2do año - colegio Pallotti','Tacuarembo','','','Defensa Central'),
	 ('Coccoli Thiago','02/06/2010',58582602,'','22271365','097 115 555','Luciaco1990@gmail.com','ASSE','Segundo de liceo(liceo 45)','Montevideo','','','Lateral Derecho'),
	 ('Farias Fernandez Johel','16/09/2010',58744232,'','23207094','95932584','alejandrafer364@gmail.com','Circulo catolico','2do de liceo','Montevideo','','','Lateral Izquierdo'),
	 ('Fernandez Thiago','15/05/2010',58560595,'','-','96584774','thiagofernandezS@gmail.com','Médica Uruguaya','','Montevideo','','','Defensa Central'),
	 ('Ferreira Lopez Juan Martin','22/06/2010',58610865,'','-','092 342 561','juanchiferreiralopez@gmail.com','Comeca','Liceo nstra Señora de Guadalupe, Canelones','Canelones','','','Lateral Derecho'),
	 ('Fredo Cavani Mateo Sebastian','13/05/2010',58549595,'Si','-','92538943','matteofredo22@gmail.com','ASSE','Liceo N°4 cursó 7mo.','Paysandú','','','Volante Exterior Derecho'),
	 ('Garcia Costa Mauro','12/03/2010',58452247,'Si','43172905','99492860','sole301080@hotmail.com','Medica Uruguaya','Comienzo 9o liceo de Migues','Migues','','','Volante Interior Izquierdo'),
	 ('Garcia Rivero Ignacio','30/05/2010',58867931,'','47350906','99739323','nachogarriv@gmail.com','Centro médico de Salto (CAM)','8vo año Palloti','Salto','','','Volante Interior Izquierdo'),
	 ('Gonzalez Nicolas','06/05/2010',58557346,'','-','93927783','nicogonz0610@gmail.com','sociedad médica universal','Liceo libano','Montevideo','','','Volante Exterior Derecho');
INSERT INTO public.administrativo ("Jugador","Fecha_Nacimiento","Documento_de_Identidad","Pasaporte","Telefono","Celular","Email","Cobertura_Medica","Estudios","Oriundo","Club_de_Origen","Club_de_Origen_Porcentaje","Posicion") VALUES
	 ('Guedes Castillo Facundo Ezequiel','03/03/2010',58479928,'','-','091 806 366','facundoguedes18@gmail.com','Medica Uruguaya','liceo 1 de toledo noveno','Toledo','','','Volante Interior Izquierdo'),
	 ('Gutierrez Ramirez Enzo Nahuel','27/02/2010',58428662,'','-','95480150','enzogutierrez102@gmail.com','ASSE','Segundo de liceo','Montevideo','','','Volante Interior Derecho'),
	 ('Hernandez Beltran Ignacio Bautista','24/01/2010',58376043,'-','-','92275811','ignaciobautistahernandez2010@gmail.com','IAC','Escuela técnica 2, tercero','Treinta y Tres','','','Volante Interior Derecho'),
	 ('Inthamoussu Tomas','03/02/2010',58389941,'D018858','26228731','96390870','tomas.intha@gmail.com','Médica Uruguaya','Liceo a definir(febrero) 3°','Montevideo','','','Defensa Central'),
	 ('Lazo Umpierrez Juan Felipe','06/09/2010',58726604,'','22189289','92203823','villafeli11@gmail.com','Asociación Española','Liceo 12, 2do','Montevideo','','','Defensa Central'),
	 ('Ledesma Puerto Thiago Xavier','01/02/2010',58432633,'','-','94211330','Thiagoledesmabolso09@gmail.com','GREMCA','Liceo 42, 3ro de liceo','Montevideo','','','Volante Exterior Derecho'),
	 ('Machin Trindade Luis Eduardo','06/02/2010',58398605,'','-','098 342 250?','luismachin2010@icloud.com','Casmu','Noveno (utu)','Montevideo','','','Arquero'),
	 ('Maurente Rodrigo','03/03/2010',58481907,'','22276636','96514251','','ASSE','Liceo 65. 3 año de liceo','Montevideo','','','Volante Interior Derecho'),
	 ('Mederos Begle Fabricio','17/04/2010',58510697,'D030748','-','99189904','fabriciomederos1710@gmail.com','Camec - americano','Colegio y liceo pallotti, 9no - tercer año','Nueva Helvecia','','','Volante Exterior Derecho'),
	 ('Miller Traversa Emiliano David','12/04/2010',58501234,'','4734 2101','99171625','emimiller007@gmail.com','Centro de Asistencia Médica de Salto CAM','Colegio Palloti, 3ro de Liceo(Noveno)','Salto','','','Defensa Central');
INSERT INTO public.administrativo ("Jugador","Fecha_Nacimiento","Documento_de_Identidad","Pasaporte","Telefono","Celular","Email","Cobertura_Medica","Estudios","Oriundo","Club_de_Origen","Club_de_Origen_Porcentaje","Posicion") VALUES
	 ('Morales Gmur Sebastian Ilich','31/05/2010',58578675,'D407061','-','94969366','agmur@uas.edu.uy','SMI','Liceo N*2 Salinas. Cursando segundo año.','Montevideo','','','Volante Exterior Derecho'),
	 ('Naya Dufrechou Francisco','04/05/2010',58534796,'','26984802','91648900','darioalejandronaya@gmail.com','Hospital Evangélico','8vo grado. Colegio La Amistad','Montevideo','','','Defensa Central'),
	 ('Nogueira Buergues Guillermo','16/05/2010',58555724,'','-','97909798','Guillermonogueira6@gmail.com','','Liceo shangrila 1er año aprobado','Canelones','','','Volante Interior Derecho'),
	 ('Pezzani Lorenzo','24/01/2010',58897617,'','26280244','098 747 647','Lolopezzani@gmail.com','COSEM','Saint Brendan''s School 3ero de liceo','Dallas','','','Arquero'),
	 ('Piñeyro Santino','19/10/2010',58796166,'','-','091 509 622','santinopineyro642@gmail.com','Hospital Evangélico','Utu union segundo','Montevideo','','','Volante Interior Izquierdo'),
	 ('Quartiani Facundo','22/02/2010',58419986,'SI','','095 721 391','silvamicaeela292@gmail.com','Medica Uruguaya','liceo 62 3ero de liceo','Montevideo','','','Volante Central'),
	 ('Ramirez Luis','12/03/2010',58450368,'','-','97553306','vivianarussi2023@gmail.com','Universal','Segundo de liceo ( liceo Montevideo )','Montevideo','','','Volante Exterior Derecho'),
	 ('Ramos Invernizzi Ignacio','24/01/2024',58354635,'C901555','-','094 283 038','cucuramos.2010@gmail.com','Asociación Española','Liceo n°20 9no','Montevideo','','','Defensa Central'),
	 ('Rios Ferreria Emiliano','25/10/2010',58804602,'','47722149','091 807 846?','jessicafl18@gmail.con','Gremeda femi','Liceo n3 de Artigas, promovido a Oactavo año','Artigas','','','Volante Interior Derecho'),
	 ('Rodella Dante','05/03/2010',58441820,'','-','97391312','danterodella25@gmail.com','COSEM','segundo año, utu de la teja','Montevideo','','','Lateral Izquierdo');
INSERT INTO public.administrativo ("Jugador","Fecha_Nacimiento","Documento_de_Identidad","Pasaporte","Telefono","Celular","Email","Cobertura_Medica","Estudios","Oriundo","Club_de_Origen","Club_de_Origen_Porcentaje","Posicion") VALUES
	 ('Rodriguez Kevin','02/01/2010',58529339,'-','-','99425000','kevinlaureiro60@gmail.com','Asociación Española','Colegio Pallotti - noveno','Montevideo','','','Delantero'),
	 ('Rodríguez Terra Juan Ignacio','28/01/2010',58381472,'D644618','43741104','98479159','juanirodriguezterra7@gmail.com','Medica Uruguaya','Noveno año','Montevideo','','','Lateral Derecho'),
	 ('Ruiz Gómez Emilio Gastón','27/02/2010',58429252,'','-','99558471','miangel29121989@hotmail.com','Camedur','Liceo Doctor Francisco Ríos, 9° año','','Nacional Sarandi del Yi','','Volante Exterior Izquierdo'),
	 ('Saravia Torres Francisco','22/12/2010',58891920,'','462 31893','99380655','Saraviafrancisco364@gmail.com','Casmer(América)','Segundo de liceo colegio palloti','Rivera','','','Arquero'),
	 ('Sosa Benjamin','19/01/2010',58368004,'-','-','91260797','-','Comero','Liceo Cebollatí, tercero','Cebollati','','','Volante Exterior Izquierdo'),
	 ('Tapia Fernández Lautaro Nicolás','25/08/2010',58708537,'','43362225','93338274','lautaronicolastapia2010@gmail.com','Comeca','Liceo Los Cerrillos, año 8vo','Canelones','','','Delantero'),
	 ('Acosta Facundo','15/04/2006',55862728,'','','94677431','facundoacosta.conve10@gmail.com','','','','','','Lateral Izquierdo'),
	 ('Bianchi Juan Felipe','16/02/2006',55865247,'D615965','44525072','094 753 337','richtoffencod@gmail.com','Sanatorio Americano','6to año liceo - Liceo Zorrilla','Treinta y Tres','Club Atlético Huracán','','Arquero'),
	 ('Bonilla Federico','08/12/2005',55733191,'','43132432','91631036','fedebonilla12@gmail.com','COMECA','Liceo "Dr. Juan Maria Falero"- 4to año','Santa Rosa, Canelones','Club Atlético Ideal','','Arquero'),
	 ('Brener Francisco','26/02/2006',56511586,'','','94446317','Franciscobrener39@gmail.com','COMECA','5to año liceo - Liceo n°1 Canelones','Canelones','Club atletico Barrio sur Canelones','','Volante Exterior Izquierdo');
INSERT INTO public.administrativo ("Jugador","Fecha_Nacimiento","Documento_de_Identidad","Pasaporte","Telefono","Celular","Email","Cobertura_Medica","Estudios","Oriundo","Club_de_Origen","Club_de_Origen_Porcentaje","Posicion") VALUES
	 ('Calione Paolo','22/05/2006',55930632,'D393463','4332 8389','94632937','paolocalione@gmail.com','COMECA','5to año liceo - Liceo Tomas Berreta','Canelones','Club Social Deportivo y Católico Fátima','','Defensa Central'),
	 ('Cuadro Navarro Alexis Ezequiel','07/02/2006',55666667,'','2314 1333','97082403','cuadro7206@gmail.com','Hospital Militar','Area Comunitaria, 1ro','Montevideo','COVICENOVA','','Volante Central'),
	 ('Dalmas Jonathan','22/06/2006',55962093,'','','98447568','','Asociación Española','Pedro Poveda, Curso 2 año','Dolores, Soriano','Bella Vista','','Volante Interior Derecho'),
	 ('Del Pino Emiliano','28/04/2006',56656267,'','','92399023','emilianodelpino23@gmail.com','Salud Publica','','Montevideo','','','Delantero'),
	 ('Echeverria Juan Pedro','14/05/2006',56618702,'D169449','26006742','92559588','jope.echeverria@gmail.com','MP','British Schools 3er año','Montevideo','Euskalerria','','Lateral Izquierdo'),
	 ('Espinosa Ferreira Santiago','10/10/2006',56241307,'','4352 5150','91787672','sanespino20@gmail.com','COMEF','Liceo N*1 IMO','Florida','Nacional de Florida','','Defensa Central'),
	 ('Garcia Juan Ignacio','25/06/2006',56397596,'YB7832095 // D490870 - vence 20/08/2031','23654800','98622060','Juaaaaanigl9@gmail.com','CRAMI','San Isidro 3er año de liceo','Las Piedras, Canelones','Cultural Florida','','Defensa Central'),
	 ('Gimenez Pintos Agustin','09/04/2006',55780150,'','-','97352751','55780150ag@gmail.com','','Facultad de Medicina, primer año','Florida','Candil','','Arquero'),
	 ('Lopez Nahuel','24/01/2007',56763107,'No','','98534352','Nahuellopes@gmail com','CAMCEL','Palotti , 1er año','Melo, Cerro Largo','Wanderers de Melo','','Volante Creativo'),
	 ('Martino Emiliano','05/09/2006',56062375,'D141307','43324243','92553180','sdamiano@adinet.com.uy','COMECA','Liceo Tomás Berreta Canelones 6to año Economía','Canelones','CA Libertad','','Defensa Central');
INSERT INTO public.administrativo ("Jugador","Fecha_Nacimiento","Documento_de_Identidad","Pasaporte","Telefono","Celular","Email","Cobertura_Medica","Estudios","Oriundo","Club_de_Origen","Club_de_Origen_Porcentaje","Posicion") VALUES
	 ('Nuñez Pavel','02/04/2006',55645491,'','','93459252','pavelbr2021@gmail.com','Hospital Militar','5to año','Colonia','El General','','Delantero'),
	 ('Pedrouzo Federico','07/03/2006',NULL,'','','91895660','','','','','','','Defensa Central'),
	 ('Petit Gonzalo','21/09/2006',56304995,'C659346','4542 2623','91509969','gonzalopetit19@gmail.com','CAMOC','Pallotti 3 año','Carmelo, Colonia','Artigas FC','','Delantero'),
	 ('Piriz Ezequiel','16/07/2006',55913274,'','','94820581','','CUDAM','','Montevideo','','','Lateral Derecho'),
	 ('Quinteros Brian','22/01/2005',55203788,'','','91260785','quinterosbrian39@gmail.com','','5° Humanístico','Artigas','Progreso','','Volante Central'),
	 ('Riccetto Ladereche Juan Andres','01/12/2005',55696365,'','','99525499','juanchiriccetto1011@gmail.com','ASSE','6to año medicina','Artigas','San Eugenio','','Volante Exterior Derecho'),
	 ('Rijo Tiago','14/06/2005',56154231,'','','91613742','','FONASA','Colegio Pedro Poveda, curso 2 año','Fray Marcos, Florida','Atlético Fray Marcos','','Volante Exterior Derecho'),
	 ('Rolando Mauro','24/02/2006',56600456,'','','94297837','','Medica Uruguaya','','Canelones','','','Lateral Derecho'),
	 ('Sanchez Aranda Benjamín','08/05/2005',55635432,'','','99243659','','Médica Uruguaya','1ro liceo','Paysandú','Defensor Sporting','','Volante Exterior Izquierdo'),
	 ('Vazquez Lautaro','01/01/2006',56491635,'','','','','','','','','','Lateral Derecho');
INSERT INTO public.administrativo ("Jugador","Fecha_Nacimiento","Documento_de_Identidad","Pasaporte","Telefono","Celular","Email","Cobertura_Medica","Estudios","Oriundo","Club_de_Origen","Club_de_Origen_Porcentaje","Posicion") VALUES
	 ('Viera Tomas','18/03/2006',56177712,'','45524934','92368416','Tomy.viera@icloud.com','Asociación Española','Colegio Liceo Pallotti - 4 año','Montevideo','Nacional de Nueva Helvecia','','Defensa Central'),
	 ('Vitor Joao','04/07/2006',0,'','','','','','','','','','Volante Central');

	
	
	
-- Add a new column for the name in the right order
ALTER TABLE administrativo ADD COLUMN nombre VARCHAR(255);  -- Adjust the data type and length as needed

-- Update the new column with the correct order of names
UPDATE administrativo
SET nombre = CONCAT(SPLIT_PART("Jugador", ' ', 2), ' ', SPLIT_PART("Jugador", ' ', 1));

UPDATE administrativo
SET nombre = 
    CASE 
        WHEN POSITION(' ' IN "Jugador") > 0 THEN 
            CONCAT(SUBSTRING("Jugador" FROM POSITION(' ' IN "Jugador") + 1), ' ', SUBSTRING("Jugador" FROM 1 FOR POSITION(' ' IN "Jugador") - 1))
        ELSE 
            "Jugador" 
    END;
   

CREATE EXTENSION IF NOT EXISTS unaccent;
	
UPDATE administrativo
SET nombre = translate(
    lower(nombre), 
    'áéíóúäëïöüàèìòùâêîôûãẽĩõũñç',
    'aeiouaeiouaeiouaeiouaeiounca');
   
   
-------------------------------------------
-- interdiciplinaria
-- Add a new column for the name in the right order
--ALTER TABLE administrativo ADD COLUMN nombre VARCHAR(255);  -- Adjust the data type and length as needed

-- Update the new column with the correct order of names
UPDATE administrativo
SET nombre = CONCAT(SPLIT_PART("Jugador", ' ', 2), ' ', SPLIT_PART("Jugador", ' ', 1));
	


UPDATE administrativo
SET nombre = 
    CASE 
        WHEN POSITION(' ' IN "Jugador") > 0 THEN 
            CONCAT(SUBSTRING("Jugador" FROM POSITION(' ' IN "Jugador") + 1), ' ', SUBSTRING("Jugador" FROM 1 FOR POSITION(' ' IN "Jugador") - 1))
        ELSE 
            "Jugador" 
    END;
   

CREATE EXTENSION IF NOT EXISTS unaccent;
	
UPDATE administrativo
SET nombre = translate(
    lower(nombre), 
    'áéíóúäëïöüàèìòùâêîôûãẽĩõũñç',
    'aeiouaeiouaeiouaeiouaeiounca');
   
   
-------------------------------------------z
   
   
   
	
select a."Fecha_Nacimiento" from administrativo a limit 2;
select * from fotos_path fp limit 1;

-- Jugadores que matchean planilla + foto

select distinct(a."nombre"), "Jugador","Fecha_Nacimiento","Documento_de_Identidad","Pasaporte","Telefono","Celular","Email","Cobertura_Medica","Estudios","Oriundo","Club_de_Origen","Club_de_Origen_Porcentaje","Posicion","id","categoria","path_foto",fp."alias",fp."masaF0",fp."sumatoriaPliegues",fp."relacionMusculoHueso"
from administrativo a 
left join fotos_path fp on fp."nombre" = a.nombre
left join stats on a."Documento_de_Identidad" = cedula
;
	


-- Jugadores sin matchear planilla <> fotos

select nombre, categoria from
(select nombre, a."Fecha_Nacimiento" as categoria from administrativo a where nombre not in (select distinct(fp.nombre)
from administrativo a 
join fotos_path fp on fp.nombre = a.nombre)) q1
union (
select nombre, categoria from fotos_path fp2 where nombre not in (select distinct(fp.nombre)
from administrativo a 
join fotos_path fp on fp.nombre = a.nombre)
)
order by nombre
;




-- SOLO PARA VALIDAR QUE LO QUE ESCTOY CREANDO EN EL JUPYTER TENGA SENTIDO, ESTO SE PUEDE BORRAR NOMAS
CREATE TABLE IF NOT EXISTS peores_escenarios (id SERIAL PRIMARY KEY, jugador INTEGER, metrica TEXT, i_ventana INTEGER, tamaño_ventana INTEGER, distancia_total FLOAT, hsr_total FLOAT, sprint_total FLOAT, aceleraciones INTEGER, desaceleraciones INTEGER, hml_distance FLOAT, amp FLOAT, inicio_ventana TIMESTAMP, fin_ventana TIMESTAMP);
-- public.danubio_processed_view source

CREATE OR REPLACE VIEW public.danubio_processed_view
AS SELECT danubio_processed.player_id,
    danubio_processed.player_display_name,
    danubio_processed."time",
    danubio_processed.elapsed_time,
    danubio_processed.lat,
    danubio_processed.lon,
    danubio_processed.speed,
    danubio_processed.instantaneous_acceleration,
    danubio_processed.heart_rate,
    danubio_processed.distancia_total_calc,
    danubio_processed.hsr_total_calc,
    danubio_processed.sprint_total_calc,
    danubio_processed.aceleraciones_calc,
    danubio_processed.desaceleraciones_calc,
    danubio_processed.hml_distance_calc
   FROM danubio_processed
  WHERE danubio_processed.distancia_total_calc != 'NaN';

--SELECT
--    player_display_name,
--    distancia,
--    hsr,
--    sprints,
--    aceleraciones,
--    desaceleraciones,
--    hmld
--    sum(hmld)
--FROM (
--    SELECT
--        player_display_name,
--        SUM(distancia_total_calc) AS distancia,
--        MAX(hsr_total_calc) AS hsr,
--        COUNT(CASE WHEN sprint_total_calc > 0 THEN 1 END) AS sprints,
--        COUNT(CASE WHEN aceleraciones_calc > 2 THEN 1 END) AS aceleraciones,
--        COUNT(CASE WHEN desaceleraciones_calc < -2 THEN 1 END) AS desaceleraciones,
--        SUM(hml_distance_calc) AS hmld
--    FROM
--        public.danubio_processed_view
--    GROUP BY
--        danubio_processed_view.player_display_name
--) AS interna
--\\
--where  dpv.hml 
;


SELECT
        player_display_name,
        SUM(distancia_total_calc) AS distancia,
        MAX(hsr_total_calc) AS hsr,
        COUNT(CASE WHEN sprint_total_calc > 0 THEN 1 END) AS sprints,
        COUNT(CASE WHEN aceleraciones_calc > 2 THEN 1 END) AS aceleraciones,
        COUNT(CASE WHEN desaceleraciones_calc < -2 THEN 1 END) AS desaceleraciones,
        SUM(hml_distance_calc) AS hmld,
  SUM(CASE WHEN hsr_total_calc max_hsr - 0.5 AND max_hsr + 0.5 THEN hml_distance_calc END) AS hmld_restricted
    FROM
        public.danubio_processed_view
    GROUP BY
        danubio_processed_view.player_display_name;

        
WITH MaxHSR AS (
  SELECT 
    player_display_name, 
    MAX(hsr_total_calc) OVER (PARTITION BY player_display_name) AS max_hsr
  FROM 
    public.danubio_processed_view
)
SELECT 
  p.player_display_name, 
  SUM(p.distancia_total_calc) AS distancia, 
  MAX(p.hsr_total_calc) AS hsr,
  COUNT(CASE WHEN p.sprint_total_calc > 0 THEN 1 END) AS sprints,
  COUNT(CASE WHEN p.aceleraciones_calc > 2 THEN 1 END) AS aceleraciones,
  COUNT(CASE WHEN p.desaceleraciones_calc < -2 THEN 1 END) AS desaceleraciones,
  SUM(CASE WHEN p.hsr_total_calc BETWEEN max_hsr - 0.5 AND max_hsr + 0.5 THEN p.hml_distance_calc END) AS hmld_restricted
FROM 
  public.danubio_processed_view p
INNER JOIN MaxHSR m ON p.player_display_name = m.player_display_name
GROUP BY 
  p.player_display_name;

 
 
WITH MaxHSR AS (
  SELECT 
    player_display_name, 
    MAX(hsr_total_calc) OVER (PARTITION BY player_display_name) AS max_hsr
  FROM 
    public.danubio_processed_view
)
SELECT 
  p.player_display_name, 
  SUM(p.distancia_total_calc) AS distancia, 
  MAX(p.hsr_total_calc) AS hsr,
  COUNT(CASE WHEN p.sprint_total_calc > 0 THEN 1 END) AS sprints,
  COUNT(CASE WHEN p.aceleraciones_calc > 2 THEN 1 END) AS aceleraciones,
  COUNT(CASE WHEN p.desaceleraciones_calc < -2 THEN 1 END) AS desaceleraciones,
  SUM(CASE WHEN (p.hsr_total_calc - max_hsr) <= 0.5 THEN p.hml_distance_calc END) AS hmld_restricted
FROM 
  public.danubio_processed_view p
INNER JOIN MaxHSR m ON p.player_display_name = m.player_display_name
GROUP BY 
  p.player_display_name;
  

 
   SELECT 
    distinct(player_display_name), 
    MAX(hsr_total_calc) OVER (PARTITION BY player_display_name) AS max_hsr
  FROM 
    public.danubio_processed_view
;
 
 
WITH MaxHSR AS (
  SELECT 
    player_display_name, 
    MAX(hsr_total_calc) OVER (PARTITION BY player_display_name) AS max_hsr
  FROM 
    public.danubio_processed_view
)
SELECT 
  p.player_display_name,
  m.max_hsr,
  SUM(CASE WHEN p.hsr_total_calc IS NOT NULL AND m.max_hsr IS NOT NULL AND ABS(p.hsr_total_calc - m.max_hsr) <= 0.5 THEN p.hml_distance_calc END) AS hmld_restricted
FROM 
  public.danubio_processed_view p
INNER JOIN MaxHSR m ON p.player_display_name = m.player_display_name
GROUP BY 
  p.player_display_name, m.max_hsr;
  
 
-- ###########################################################
--  // almost
-- TODOS LOS SPRINTS ORDENADOS POR HORA, CON LA DISTANCIA Y el HSR MAXIMO
WITH Sprints AS (
  SELECT
    player_display_name,
    time,
    hsr_total_calc,
    distancia_total_calc,
    CASE WHEN hsr_total_calc >= 19.8 AND LAG(hsr_total_calc) OVER (PARTITION BY player_display_name ORDER BY time) < 19.8 THEN 1 ELSE 0 END AS is_sprint_start,
    CASE WHEN hsr_total_calc < 19.8 AND LAG(hsr_total_calc) OVER (PARTITION BY player_display_name ORDER BY time) >= 19.8 THEN 1 ELSE 0 END AS is_sprint_end
  FROM
    public.danubio_processed_view
),
SprintsWithGroups AS (
  SELECT
    *,
    SUM(is_sprint_start) OVER (PARTITION BY player_display_name ORDER BY time) AS grp
  FROM
    Sprints
)
SELECT
  SprintsWithGroups.player_display_name,
  SprintsWithGroups.time,
  grp,
  MAX(hsr_total_calc) AS max_hsr,
  SUM(distancia_total_calc) AS sprint_distance
FROM
  SprintsWithGroups
WHERE
  is_sprint_start = 1
GROUP BY
  player_display_name, grp, distancia_total_calc, time
order by player_display_name, time;
  
 

-- SELECT
--    player_display_name,
--    time,
--    hsr_total_calc,
--    distancia_total_calc,
--    CASE WHEN hsr_total_calc >= 19.8 AND LAG(hsr_total_calc) OVER (PARTITION BY player_display_name ORDER BY time) < 19.8 THEN 1 ELSE 0 END AS is_sprint_start,
--    CASE WHEN hsr_total_calc < 19.8 AND LAG(hsr_total_calc) OVER (PARTITION BY player_display_name ORDER BY time) >= 19.8 THEN 1 ELSE 0 END AS is_sprint_end
--  FROM
--    public.danubio_processed_view;
    
   
   
-- ###########################################################
-- TODOS LOS SPRINTS CON HORA DE INICIO Y HORA DE FIN
WITH Sprints AS (
  SELECT
    player_display_name,
    time,
    hsr_total_calc,
    distancia_total_calc,
    CASE WHEN hsr_total_calc >= 19.8 AND LAG(hsr_total_calc) OVER (PARTITION BY player_display_name ORDER BY time) < 19.8 THEN 1 ELSE 0 END AS is_sprint_start,
    CASE WHEN hsr_total_calc < 19.8 AND LAG(hsr_total_calc) OVER (PARTITION BY player_display_name ORDER BY time) >= 19.8 THEN 1 ELSE 0 END AS is_sprint_end
  FROM
    public.danubio_processed_view
),
SprintsWithGroups AS (
  SELECT
    *,
    SUM(is_sprint_start) OVER (PARTITION BY player_display_name ORDER BY time) AS grp
  FROM
    Sprints
)
SELECT
  player_display_name,
  grp,
  MIN(time) AS sprint_start,
  MAX(time) AS sprint_end,
  MAX(hsr_total_calc) AS max_hsr,
  SUM(CASE WHEN is_sprint_start = 1 OR is_sprint_end = 1 THEN distancia_total_calc END) AS sprint_distance
FROM
  SprintsWithGroups
WHERE
  is_sprint_start = 1 OR is_sprint_end = 1
GROUP BY
  player_display_name, grp
ORDER BY
  player_display_name, grp;
  
 
 
-- ###########################################################
-- MEDIO AL PEDO
 WITH Sprints AS (
  SELECT
    player_display_name,
    time,
    hsr_total_calc,
    distancia_total_calc,
    CASE WHEN hsr_total_calc >= 19.8 AND LAG(hsr_total_calc) OVER (PARTITION BY player_display_name ORDER BY time) < 19.8 THEN 1 ELSE 0 END AS is_sprint_start,
    CASE WHEN hsr_total_calc < 19.8 AND LAG(hsr_total_calc) OVER (PARTITION BY player_display_name ORDER BY time) >= 19.8 THEN 1 ELSE 0 END AS is_sprint_end
  FROM
    public.danubio_processed_view
),
SprintsWithGroups AS (
  SELECT
    *,
    SUM(is_sprint_start) OVER (PARTITION BY player_display_name ORDER BY time) AS grp
  FROM
    Sprints
)
SELECT
  player_display_name,
  MIN(time) AS sprint_start,
  MAX(time) AS sprint_end,
  MAX(hsr_total_calc) AS max_hsr,
  SUM(distancia_total_calc) AS sprint_distance
FROM
  SprintsWithGroups
WHERE grp > 0  -- Filtramos solo las filas que pertenecen a un sprint
GROUP BY
  player_display_name, time, distancia_total_calc
ORDER BY
  player_display_name, time;
  
 
--   SELECT
--    player_display_name,
--    time,
--    hsr_total_calc,
--    distancia_total_calc,
--    CASE WHEN hsr_total_calc >= 19.8 AND LAG(hsr_total_calc) OVER (PARTITION BY player_display_name ORDER BY time) < 19.8 THEN 1 ELSE 0 END AS is_sprint_start,
--    CASE WHEN hsr_total_calc < 19.8 AND LAG(hsr_total_calc) OVER (PARTITION BY player_display_name ORDER BY time) >= 19.8 THEN 1 ELSE 0 END AS is_sprint_end
--  FROM
--    public.danubio_processed_view;

    
-- chatgpt
-- ###########################################################
-- CUALQUIERA
 WITH sprint_data AS (
    SELECT 
        player_display_name, 
        time,
        speed,
        hsr_total_calc, 
        distancia_total_calc,
        LAG(hsr_total_calc) OVER (PARTITION BY player_display_name ORDER BY time) AS prev_hsr,
        LEAD(hsr_total_calc) OVER (PARTITION BY player_display_name ORDER BY time) AS next_hsr
    FROM public.danubio_processed_view
    WHERE hsr_total_calc > 0
)
SELECT 
    player_display_name,
    SUM(distancia_total_calc) AS total_sprint_distance
FROM sprint_data
WHERE 
    -- El inicio del sprint es cuando el HSR pasó de 0 a > 19.8
    prev_hsr = 0
    -- El final del sprint es cuando HSR vuelve a 0 después del máximo
    OR next_hsr = 0
GROUP BY player_display_name;



-- ###########################################################
-- TODOS LOS SPRINTS SIN FILTRAR POR > 19.8
SELECT 
        player_display_name, 
        time,
        speed,
        hsr_total_calc, 
        distancia_total_calc,
        LAG(hsr_total_calc) OVER (PARTITION BY player_display_name ORDER BY time) AS prev_hsr,
        LEAD(hsr_total_calc) OVER (PARTITION BY player_display_name ORDER BY time) AS next_hsr
    FROM public.danubio_processed_view;

   
-- ###########################################################
-- LAS DISTANCIAS DE LOS SPRINTS, (SIN FILTRAR POR HORA)
WITH sprint_data AS (
    SELECT 
        player_display_name, 
        time,
        speed,
        hsr_total_calc, 
        distancia_total_calc,
        LAG(hsr_total_calc) OVER (PARTITION BY player_display_name ORDER BY time) AS prev_hsr,
        LEAD(hsr_total_calc) OVER (PARTITION BY player_display_name ORDER BY time) AS next_hsr
    FROM public.danubio_processed_view
)
SELECT 
    player_display_name,
    SUM(distancia_total_calc) AS total_sprint_distance,
    time
FROM sprint_data
WHERE 
    -- El inicio del sprint es cuando el HSR pasa de 0 a > 19.8
    (prev_hsr = 0 AND hsr_total_calc > 0)
    -- El final del sprint es cuando HSR vuelve a 0 después de estar en > 19.8
    OR (hsr_total_calc > 0 AND next_hsr = 0)
GROUP BY player_display_name, time;



-- ###########################################################
-- LOS SPRINTS CON DISTANCIAS, IDENTIFICADOS POR ID Y ADEMÁS CON HORA
WITH sprint_data AS (
    SELECT 
        player_display_name, 
        time,
        speed,
        hsr_total_calc, 
        distancia_total_calc,
        LAG(hsr_total_calc) OVER (PARTITION BY player_display_name ORDER BY time) AS prev_hsr,
        LEAD(hsr_total_calc) OVER (PARTITION BY player_display_name ORDER BY time) AS next_hsr
    FROM public.danubio_processed_view
),
grouped_sprints AS (
    SELECT
        player_display_name,
        time,
        speed,
        hsr_total_calc,
        distancia_total_calc,
        -- Definir cuándo empieza un nuevo sprint (de 0 a >19.8)
        SUM(CASE 
            WHEN prev_hsr = 0 AND hsr_total_calc > 0 THEN 1 
            ELSE 0 
        END) OVER (PARTITION BY player_display_name ORDER BY time) AS sprint_id
    FROM sprint_data
)
SELECT
    player_display_name,
    sprint_id,
    MIN(time) AS sprint_start_time,
    MAX(time) AS sprint_end_time,
    SUM(distancia_total_calc) AS total_sprint_distance
FROM grouped_sprints
WHERE hsr_total_calc > 0  -- Considerar solo las filas donde se superó el umbral
GROUP BY player_display_name, sprint_id
ORDER BY player_display_name, sprint_id;



-- ###########################################################
-- TODOS LOS SPRINTS CON HORA ID DISTANCIA Y VELOCIDAD MAXIMA
WITH sprint_data AS (
    SELECT 
        player_display_name, 
        time,
        speed,
        hsr_total_calc, 
        distancia_total_calc,
        LAG(hsr_total_calc) OVER (PARTITION BY player_display_name ORDER BY time) AS prev_hsr,
        LEAD(hsr_total_calc) OVER (PARTITION BY player_display_name ORDER BY time) AS next_hsr
    FROM public.danubio_processed_view
),
grouped_sprints AS (
    SELECT
        player_display_name,
        time,
        speed,
        hsr_total_calc,
        distancia_total_calc,
        -- Definir cuándo empieza un nuevo sprint (de 0 a >19.8)
        SUM(CASE 
            WHEN prev_hsr = 0 AND hsr_total_calc > 0 THEN 1 
            ELSE 0 
        END) OVER (PARTITION BY player_display_name ORDER BY time) AS sprint_id
    FROM sprint_data
)
SELECT
    player_display_name,
    sprint_id,
    MIN(time) AS sprint_start_time,
    MAX(time) AS sprint_end_time,
    SUM(distancia_total_calc) AS total_sprint_distance,
    MAX(hsr_total_calc) AS max_hsr_total_calc  -- Obtener el valor máximo de HSR en cada sprint
FROM grouped_sprints
WHERE hsr_total_calc > 0  -- Considerar solo las filas donde se superó el umbral
GROUP BY player_display_name, sprint_id
ORDER BY player_display_name, sprint_id;


-- ###########################################################
-- ###########################################################
--la creme de la creme
-- ###########################################################
-- WCS DE CADA JUGADOR CON SU VELOVIDAD MAXIMA, SUMANDO LAS DISTANCIAS Y EN EL SEGUNDO DONDE SE DA LA VELOCIDAD MAXIMA
WITH sprint_data AS (
    SELECT 
        player_display_name, 
        time,
        speed,
        hsr_total_calc, 
        distancia_total_calc,
        LAG(hsr_total_calc) OVER (PARTITION BY player_display_name ORDER BY time) AS prev_hsr,
        LEAD(hsr_total_calc) OVER (PARTITION BY player_display_name ORDER BY time) AS next_hsr
    FROM public.danubio_processed_view
),
grouped_sprints AS (
    SELECT
        player_display_name,
        time,
        speed,
        hsr_total_calc,
        distancia_total_calc,
        -- Definir cuándo empieza un nuevo sprint (de 0 a >19.8)
        SUM(CASE 
            WHEN prev_hsr = 0 AND hsr_total_calc > 0 THEN 1 
            ELSE 0 
        END) OVER (PARTITION BY player_display_name ORDER BY time) AS sprint_id
    FROM sprint_data
),
sprints_summary AS (
    SELECT
        player_display_name,
        sprint_id,
        MIN(time) AS sprint_start_time,
        MAX(time) AS sprint_end_time,
        SUM(distancia_total_calc) AS total_sprint_distance,
        MAX(hsr_total_calc) AS max_hsr_total_calc
    FROM grouped_sprints
    WHERE hsr_total_calc > 0  -- Considerar solo las filas donde se superó el umbral
    GROUP BY player_display_name, sprint_id
)
SELECT *
FROM sprints_summary
WHERE (player_display_name, max_hsr_total_calc) IN (
    SELECT player_display_name, MAX(max_hsr_total_calc)
    FROM sprints_summary
    GROUP BY player_display_name
);


-- ###########################################################
-- ###########################################################
-- ###########################################################
--- WCS como pidio wilson
-- ###########################################################
-- ###########################################################
-- LITERAL ESTO ES LO QUE HACEN LOS ACADEMICOS, LAS VENTANAS FIJADAS POR MINUTO
WITH high_speed_data AS (
    SELECT 
        player_display_name, 
        time,
        distancia_total_calc,
        speed,
        -- Crear un intervalo de minutos a partir del campo 'time' en formato de hora
        DATE_TRUNC('minute', '00:00:00'::TIME + (SUBSTRING(time FROM 1 FOR 2) || ' hours')::INTERVAL
                    + (SUBSTRING(time FROM 4 FOR 2) || ' minutes')::INTERVAL
                    + (SUBSTRING(time FROM 7) || ' seconds')::INTERVAL) AS minute
    FROM public.danubio_processed_view
    WHERE speed > 19.8 -- Filtrar solo las velocidades superiores a 19.8 km/h
),
minute_distances AS (
    SELECT
        player_display_name,
        minute,
        SUM(distancia_total_calc) AS total_distance_per_minute
    FROM high_speed_data
    GROUP BY player_display_name, minute
),
max_minute_distance AS (
    SELECT 
        player_display_name,
        MAX(total_distance_per_minute) AS max_distance -- La mayor distancia en un minuto
    FROM minute_distances
    GROUP BY player_display_name
)
SELECT 
    m.player_display_name,
    m.minute AS start_minute,
    m.minute + INTERVAL '1 minute' AS end_minute,
    m.total_distance_per_minute AS distance_covered
FROM minute_distances m
JOIN max_minute_distance d ON m.player_display_name = d.player_display_name 
                           AND m.total_distance_per_minute = d.max_distance
ORDER BY m.player_display_name;




-- segunda verion
--WITH high_speed_data AS (
--    SELECT 
--        player_display_name, 
--        time,
--        distancia_total_calc,
--        speed,
--        -- Crear un intervalo de segundos a partir del campo 'time'
--        '00:00:00'::TIME + 
--        (SUBSTRING(time FROM 1 FOR 2) || ' hours')::INTERVAL
--        + (SUBSTRING(time FROM 4 FOR 2) || ' minutes')::INTERVAL
--        + (SUBSTRING(time FROM 7) || ' seconds')::INTERVAL AS second_interval
--    FROM public.danubio_processed_view
--    WHERE speed > 19.8 -- Filtrar solo las velocidades superiores a 19.8 km/h
--),
--second_distances AS (
--    SELECT
--        player_display_name,
--        second_interval,
--        SUM(distancia_total_calc) AS total_distance_per_second
--    FROM high_speed_data
--    GROUP BY player_display_name, second_interval
--),
--max_second_distance AS (
--    SELECT 
--        player_display_name,
--        MAX(total_distance_per_second) AS max_distance -- La mayor distancia en un segundo
--    FROM second_distances
--    GROUP BY player_display_name
--)
--SELECT 
--    s.player_display_name,
--    s.second_interval AS start_second,
--    s.second_interval + INTERVAL '1 second' AS end_second,
--    s.total_distance_per_second AS distance_covered
--FROM second_distances s
--JOIN max_second_distance d ON s.player_display_name = d.player_display_name 
--                           AND s.total_distance_per_second = d.max_distance
--ORDER BY s.player_display_name;


---

-- ###########################################################
-- ###########################################################
-- ###########################################################
-- ###########################################################
-- ###########################################################
-- TODAS LAS VENTANAS DE LOS JUGADORES
WITH high_speed_data AS (
    SELECT 
        player_display_name, 
        time,
        distancia_total_calc,
        speed,
        '00:00:00'::TIME + 
        (SUBSTRING(time FROM 1 FOR 2) || ' hours')::INTERVAL
        + (SUBSTRING(time FROM 4 FOR 2) || ' minutes')::INTERVAL
        + (SUBSTRING(time FROM 7) || ' seconds')::INTERVAL AS second_interval
    FROM public.danubio_processed_view
    WHERE speed > 19.8 -- Filtrar solo las velocidades superiores a 19.8 km/h
),
minute_window_data AS (
    SELECT 
        player_display_name,
        second_interval,
        SUM(distancia_total_calc) OVER (
            PARTITION BY player_display_name 
            ORDER BY second_interval
            RANGE BETWEEN INTERVAL '0 seconds' PRECEDING AND INTERVAL '59 seconds' FOLLOWING
        ) AS total_distance_in_minute
    FROM high_speed_data
),
max_minute_window AS (
    SELECT 
        player_display_name,
        MAX(total_distance_in_minute) AS max_distance -- La mayor distancia en un intervalo de 60 segundos
    FROM minute_window_data
    GROUP BY player_display_name
)
SELECT 
    m.player_display_name,
    m.second_interval AS start_second,
    m.second_interval + INTERVAL '1 minute' AS end_second,
    m.total_distance_in_minute AS distance_covered
FROM minute_window_data m
JOIN max_minute_window d ON m.player_display_name = d.player_display_name 


--
-- ###########################################################
-- ###########################################################
-- WCS DE CADA JUGADOR SINCRONIZADA CON EL VIDEO
WITH high_speed_data AS (
    SELECT 
        player_display_name, 
        time,
        distancia_total_calc,
        speed,
        '00:00:00'::TIME + 
        (SUBSTRING(time FROM 1 FOR 2) || ' hours')::INTERVAL
        + (SUBSTRING(time FROM 4 FOR 2) || ' minutes')::INTERVAL
        + (SUBSTRING(time FROM 7) || ' seconds')::INTERVAL AS second_interval
    FROM public.danubio_processed_view
    WHERE speed > 19.8 -- Filtrar solo las velocidades superiores a 19.8 km/h
),
minute_window_data AS (
    SELECT 
        player_display_name,
        second_interval,
        SUM(distancia_total_calc) OVER (
            PARTITION BY player_display_name 
            ORDER BY second_interval
            RANGE BETWEEN INTERVAL '0 seconds' PRECEDING AND INTERVAL '59 seconds' FOLLOWING
        ) AS total_distance_in_minute
    FROM high_speed_data
),
max_minute_window AS (
    SELECT 
        player_display_name,
        second_interval AS start_second,
        second_interval + INTERVAL '1 minute' AS end_second,
        total_distance_in_minute AS distance_covered,
        ROW_NUMBER() OVER (
            PARTITION BY player_display_name 
            ORDER BY total_distance_in_minute DESC
        ) AS rank
    FROM minute_window_data
)
SELECT 
    player_display_name,
    start_second,
    end_second,
    case -- Esto solo funciona para el partido de danubio
        WHEN start_second < '09:48:56' THEN start_second - INTERVAL '2 minute' - INTERVAL '9 hour' - INTERVAL '37 second'
        ELSE start_second - INTERVAL '2 minute' - INTERVAL '9 hour' - INTERVAL '37 second' - INTERVAL '900 second'
    END AS minuto_en_video_aprox,
    distance_covered
FROM max_minute_window
WHERE rank = 1
ORDER BY player_display_name;



-- ###########################################################
-- ## TODOS LOS SPRINTS con direccion A DONDE ESTÁ CORRIENDO
WITH high_speed_data AS (
    SELECT 
        player_display_name, 
        time,
        distancia_total_calc,
        speed,
        lat AS start_latitude,
        lon AS start_longitude,
        '00:00:00'::TIME + 
        (SUBSTRING(time FROM 1 FOR 2) || ' hours')::INTERVAL
        + (SUBSTRING(time FROM 4 FOR 2) || ' minutes')::INTERVAL
        + (SUBSTRING(time FROM 7) || ' seconds')::INTERVAL AS second_interval
    FROM public.danubio_processed_view
    WHERE speed > 19.8 -- Filtrar solo las velocidades superiores a 19.8 km/h
),
minute_window_data AS (
    SELECT 
        player_display_name,
        second_interval,
        SUM(distancia_total_calc) OVER (
            PARTITION BY player_display_name 
            ORDER BY second_interval
            RANGE BETWEEN INTERVAL '0 seconds' PRECEDING AND INTERVAL '59 seconds' FOLLOWING
        ) AS total_distance_in_minute,
        MIN(start_latitude) OVER (
            PARTITION BY player_display_name 
            ORDER BY second_interval
            RANGE BETWEEN INTERVAL '0 seconds' PRECEDING AND INTERVAL '59 seconds' FOLLOWING
        ) AS sprint_start_latitude,
        MIN(start_longitude) OVER (
            PARTITION BY player_display_name 
            ORDER BY second_interval
            RANGE BETWEEN INTERVAL '0 seconds' PRECEDING AND INTERVAL '59 seconds' FOLLOWING
        ) AS sprint_start_longitude,
        MAX(start_latitude) OVER (
            PARTITION BY player_display_name 
            ORDER BY second_interval
            RANGE BETWEEN INTERVAL '0 seconds' PRECEDING AND INTERVAL '59 seconds' FOLLOWING
        ) AS sprint_end_latitude,
        MAX(start_longitude) OVER (
            PARTITION BY player_display_name 
            ORDER BY second_interval
            RANGE BETWEEN INTERVAL '0 seconds' PRECEDING AND INTERVAL '59 seconds' FOLLOWING
        ) AS sprint_end_longitude
    FROM high_speed_data
),
max_minute_window AS (
    SELECT 
        player_display_name,
        second_interval AS start_second,
        second_interval + INTERVAL '1 minute' AS end_second,
        total_distance_in_minute AS distance_covered,
        sprint_start_latitude,
        sprint_start_longitude,
        sprint_end_latitude,
        sprint_end_longitude,
        ROW_NUMBER() OVER (
            PARTITION BY player_display_name 
            ORDER BY total_distance_in_minute DESC
        ) AS rank
    FROM minute_window_data
)
SELECT 
    player_display_name,
    start_second,
    end_second,
    sprint_start_latitude, sprint_end_latitude, sprint_start_longitude, sprint_end_longitude
    distance_covered,
    CASE
        WHEN sprint_end_latitude > sprint_start_latitude AND sprint_end_longitude > sprint_start_longitude THEN 'Noreste'
        WHEN sprint_end_latitude > sprint_start_latitude AND sprint_end_longitude < sprint_start_longitude THEN 'Noroeste'
        WHEN sprint_end_latitude < sprint_start_latitude AND sprint_end_longitude > sprint_start_longitude THEN 'Sureste'
        WHEN sprint_end_latitude < sprint_start_latitude AND sprint_end_longitude < sprint_start_longitude THEN 'Suroeste'
        WHEN sprint_end_latitude > sprint_start_latitude THEN 'Norte'
        WHEN sprint_end_latitude < sprint_start_latitude THEN 'Sur'
        WHEN sprint_end_longitude > sprint_start_longitude THEN 'Este'
        WHEN sprint_end_longitude < sprint_start_longitude THEN 'Oeste'
        ELSE 'Indeterminado'
    END AS sprint_direction
FROM max_minute_window
--WHERE rank = 1
ORDER BY player_display_name;


-- ###########################################################
-- TODOS LOS SPRINTS DONDE NO ESTá inDETERMINADO
WITH sprint_data AS (
    SELECT 
        player_display_name,
        time,
        speed,
        lat,
        lon,
        LAG(speed) OVER (PARTITION BY player_display_name ORDER BY time) AS prev_speed,
        CASE WHEN LAG(speed) OVER (PARTITION BY player_display_name ORDER BY time) < 19.8 
                  AND speed >= 19.8 THEN 1 ELSE 0 END AS sprint_start_flag
    FROM public.danubio_processed_view
    WHERE speed > 0
),
sprint_segments AS (
    SELECT
        player_display_name,
        time,
        speed,
        lat,
        lon,
        SUM(sprint_start_flag) OVER (PARTITION BY player_display_name ORDER BY time) AS sprint_id
    FROM sprint_data
),
segmented_directions AS (
    SELECT
        player_display_name,
        sprint_id,
        time AS segment_time,
        lat AS current_latitude,
        lon AS current_longitude,
        LEAD(lat) OVER (PARTITION BY player_display_name, sprint_id ORDER BY time) AS next_latitude,
        LEAD(lon) OVER (PARTITION BY player_display_name, sprint_id ORDER BY time) AS next_longitude,
        speed,
        CASE
            WHEN LEAD(lat) OVER (PARTITION BY player_display_name, sprint_id ORDER BY time) IS NULL
                 OR LEAD(lon) OVER (PARTITION BY player_display_name, sprint_id ORDER BY time) IS NULL THEN 'Indeterminado'
            WHEN LEAD(lat) OVER (PARTITION BY player_display_name, sprint_id ORDER BY time) > lat 
                 AND LEAD(lon) OVER (PARTITION BY player_display_name, sprint_id ORDER BY time) > lon THEN 'Noreste'
            WHEN LEAD(lat) OVER (PARTITION BY player_display_name, sprint_id ORDER BY time) > lat 
                 AND LEAD(lon) OVER (PARTITION BY player_display_name, sprint_id ORDER BY time) < lon THEN 'Noroeste'
            WHEN LEAD(lat) OVER (PARTITION BY player_display_name, sprint_id ORDER BY time) < lat 
                 AND LEAD(lon) OVER (PARTITION BY player_display_name, sprint_id ORDER BY time) > lon THEN 'Sureste'
            WHEN LEAD(lat) OVER (PARTITION BY player_display_name, sprint_id ORDER BY time) < lat 
                 AND LEAD(lon) OVER (PARTITION BY player_display_name, sprint_id ORDER BY time) < lon THEN 'Suroeste'
            WHEN LEAD(lat) OVER (PARTITION BY player_display_name, sprint_id ORDER BY time) > lat THEN 'Norte'
            WHEN LEAD(lat) OVER (PARTITION BY player_display_name, sprint_id ORDER BY time) < lat THEN 'Sur'
            WHEN LEAD(lon) OVER (PARTITION BY player_display_name, sprint_id ORDER BY time) > lon THEN 'Este'
            WHEN LEAD(lon) OVER (PARTITION BY player_display_name, sprint_id ORDER BY time) < lon THEN 'Oeste'
            ELSE 'Indeterminado'
        END AS segment_direction
    FROM sprint_segments
    WHERE speed > 19.8
),
sprint_summary AS (
    SELECT
        player_display_name,
        sprint_id,
        MIN(segment_time) AS sprint_start_time,
        MAX(segment_time) AS sprint_end_time,
        MAX(speed) AS max_speed,
        COUNT(segment_direction) AS segment_count,
        MODE() WITHIN GROUP (ORDER BY segment_direction) AS predominant_direction
    FROM segmented_directions
    GROUP BY player_display_name, sprint_id
)
SELECT *
FROM sprint_summary
WHERE predominant_direction != 'Indeterminado';





-- ###########################################################
-- OTROS EXPERIMENTOS
--select * from sprints_summary limit 10;
select time, sum(speed) as aggregate_speed from danubio_processed dp group by time order by aggregate_speed desc limit 100;
select * from danubio;
