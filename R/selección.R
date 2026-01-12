library(haven)
library(dplyr)
library(readr)

# 1. Leer fichero PISA 2022 estudiantes y de escuelas (institutos) (.sav)
estudiantes <- read_sav("CY08MSP_STU_QQQ.SAV")  # estudiantes
escuelas  <- read_sav("CY08MSP_SCH_QQQ.SAV")   # escuelas 

# 2. Filtrar país(es) de interés=Españita
estudiantes_es <- estudiantes %>%
  filter(CNT %in% c("ESP", "Spain"))

vars_pv_temp <- names(estudiantes_es)[grepl("^PV", names(estudiantes_es))]
vars_pv_temp

escuelas_es <- escuelas %>% filter(CNT %in% c("ESP", "Spain"))

escuelas_es_datos <- escuelas_es %>%
  select(CNTSCHID, SCHLTYPE)

# ----------------------------------------------
# 3. Variables de identificación
# ----------------------------------------------
vars_id <- c(
  "CNT",        # país
  "CNTSCHID",   # id centro (o SCHOOLID)
  "CNTSTUID",   # id estudiante (o STIDSTD)
  "NatCen",
  "REGION"
  
)

# ----------------------------------------------
# 4. Variables de contexto
# ----------------------------------------------
vars_contexto <- c(
  "ST001D01T",  # Grado (curso)
  "ST003D02T",  # Mes de nacimiento
  "ST003D03T",  # Año de nacimiento
  "AGE",        # EDAD
  "ST004D01T",  # Genero
  "ST005Q01JA", # Nivel estudios madre
  "ST007Q01JA", # Nivel estudios padre
  "ST127Q01TA", # Repetidor?
  "REPEAT",     # Repetidor?
  "IMMIG",      # nivel de inmigrante
  "LANGN",      # idioma en casa
  "BELONG",     # sentido de pertenencia al centro
  "BULLIED",     # bullying
  "ST273Q01JA", # no escuchan al profe
  "ST273Q02JA", # ruido
  "ST273Q03JA", # profe espera silencio
  "ST273Q04JA", # no trabajan
  "ST273Q06JA", # se distraen usando recursos digitales
  "ST273Q07JA",  # se distraen por recursos digitales de otros
  "FEELSAFE", # seguridad en la escuela
  "SCHRISK", #riesgo en la escuela
  "RELATST", 
  "EMPATAGR", # empatia
  "PERSEVAGR", # perseverancia
  "CURIOAGR", # curiosidad
  "COOPAGR", #cooperacion
  "ASSERAGR",
  "STRESAGR", #estres
  "EMOCOAGR", #control de emociones
  "EXERPRAC", #practica de deportes
  "FAMSUP",      # soporte de la familia
  "ESCS",       # índice socioeconómico
  "COBN_S",     # pais de nacieimiento del estudiante
  "COBN_M",     # pais de nacieimiento de la madre
  "COBN_F",     # pais de nacieimiento del padre
  "OCOD1",      # ocupacion de la madre
  "OCOD2",       # ocupacion del padre
  "HOMEPOS", 
  "ICTHOME"
  
)

# ----------------------------------------------
# 5. Notas de mates, lectura y ciencias
# ----------------------------------------------
vars_pv <- c(
  paste0("PV", 1:10, "MATH"),
  paste0("PV", 1:10, "READ"),
  paste0("PV", 1:10, "SCIE")
)

# ----------------------------------------------
# 6. Revisión
# ----------------------------------------------
todas_variables <- c(vars_id, vars_contexto, vars_pv)

# Nos quedamos solo con las que realmente existen en el fichero
todas_variables_ok <- intersect(todas_variables, names(estudiantes_es))

length(todas_variables_ok)  
todas_variables_ok

# 7. Crear dataset de trabajo con todas las variables seleccionadas
estudiantes_work <- estudiantes_es %>%
  select(all_of(todas_variables_ok)) %>%
  # 8. Crear medias de rendimiento por área
  mutate(
    mean_math    = rowMeans(select(., matches("^PV[0-9]+MATH$")), na.rm = TRUE),
    mean_read    = rowMeans(select(., matches("^PV[0-9]+READ$")), na.rm = TRUE),
    mean_science = rowMeans(select(., matches("^PV[0-9]+SCIE$")), na.rm = TRUE)
  )

estudiantes_work_ok <- estudiantes_work %>%
  select(
    # identificación
    any_of(vars_id),
    # contexto 
    any_of(vars_contexto),
    # medias de rendimiento
    mean_math, mean_read, mean_science
  )

ncol(estudiantes_work_ok)  


estudiantes_escuelas <- estudiantes_work_ok %>%
  left_join(escuelas_es_datos, by = "CNTSCHID") %>%
  mutate(
    school_type = case_when(
      SCHLTYPE == 1 ~ "Privada",
      SCHLTYPE == 2 ~ "Concertada",
      SCHLTYPE == 3 ~ "Pública",
      TRUE            ~ NA_character_
    )
  )



# Cálculo de la resilencia
# se podria hacer solo con mates, pero bueno, hago las tres
estudiantes_escuelas_medias <- estudiantes_escuelas %>%
  mutate(
    score_mrs = (mean_math + mean_read + mean_science) / 3
  )

# esto por ahora es sin agrupar por Comunidad eh

escs_q1  <- quantile(estudiantes_escuelas_medias$ESCS,    0.25, na.rm = TRUE)  # desfavorecidos
score_q3 <- quantile(estudiantes_escuelas_medias$score_mrs, 0.75, na.rm = TRUE)

estudiantes_escuelas_cuartiles <- estudiantes_escuelas_medias %>%
  mutate(
    desfavorecido = ESCS <= escs_q1,
    alto_rend     = score_mrs >= score_q3,
    resilente     = if_else(desfavorecido & alto_rend, 1L, 0L, missing = NA_integer_),
    resilente_fac = factor(resilente, levels = c(0,1),
                           labels = c("No resilente","Resilente"))
  )


set.seed(123)
sample <- estudiantes_escuelas_cuartiles %>%
  sample_n(10000)  

write_csv(estudiantes_escuelas_cuartiles, "pisa2022_es_trabajo_completo.csv")
write_csv(sample,   "pisa2022_es_trabajo_muestra.csv")


