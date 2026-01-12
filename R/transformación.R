library(dplyr)
library(tidyr)
library(readr)

datos_estudiantes <- read_csv("pisa2022_es_trabajo_completo.csv")

datos_base <- datos_estudiantes %>%
  filter(desfavorecido == TRUE) %>%
  mutate(
    # Sexo
    sexo = case_when(
      ST004D01T == 1 ~ "Chico",
      ST004D01T == 2 ~ "Chica",
      TRUE           ~ NA_character_
    ),
    # Origen 
    origen = case_when(
      IMMIG == 1 ~ "Nativo",
      IMMIG == 2 ~ "1ª gen",
      IMMIG == 3 ~ "2ª gen",
      TRUE       ~ NA_character_
    ),
    # Repetición
    repite = case_when(
      REPEAT == 1 ~ "Ha repetido",
      REPEAT == 0 ~ "No ha repetido",
      TRUE        ~ NA_character_
    ),
    # Tipo de centro ya está recodificado en school_type
    centro = school_type
  )

perfil_long <- datos_base %>%
  select(resilente_fac, sexo, origen, repite, centro) %>%
  pivot_longer(
    cols      = c(sexo, origen, repite, centro),
    names_to  = "factor",
    values_to = "categoria"
  ) %>%
  filter(!is.na(categoria), !is.na(resilente_fac)) %>%
  count(factor, categoria, resilente_fac, name = "n") %>%
  group_by(factor, resilente_fac) %>%
  mutate(
    total_grupo = sum(n),
    prop        = n / total_grupo
  ) %>%
  ungroup()

# guardo
write_csv(perfil_long, "perfil_long.csv")


# segunda parte
datos_base2 <- datos_estudiantes %>%
  filter(desfavorecido == TRUE)

items <- c(
  "ST273Q01JA", # no escuchan 
  "ST273Q02JA", # ruido
  "ST273Q03JA", # profe espera silencio
  "ST273Q04JA", # no trabajan
  "ST273Q06JA", # se distraen usando recursos digitales
  "ST273Q07JA"  # se distraen por recursos digitales de otros
)

datos_clima <- datos_base2 %>%
  select(resilente_fac, all_of(items)) %>%
  mutate(across(
    all_of(items),
    ~ case_when(
      . %in% c(95, 97, 98, 99) ~ NA_character_,          # códigos especiales -> NA
      . == 1 ~ "Cada clase",                             # Every lesson
      . == 2 ~ "La mayoría de las clases",               # Most lessons
      . == 3 ~ "Algunas clases",                         # Some lessons
      . == 4 ~ "Nunca o casi nunca",                     # Never or almost never
      TRUE   ~ NA_character_
    )
  ))

aula_likert <- datos_clima %>%
  pivot_longer(
    cols      = all_of(items),
    names_to  = "item",
    values_to = "respuesta"
  ) %>%
  filter(!is.na(respuesta), !is.na(resilente_fac)) %>%
  count(item, resilente_fac, respuesta, name = "n") %>%
  group_by(item, resilente_fac) %>%
  mutate(
    total_grupo = sum(n),
    prop        = n / total_grupo
  ) %>%
  ungroup()

item_labels <- tibble::tibble(
  item = items,
  item_label = c(
    "No escuchan al profesor/a (Q01)",
    "Ruido en clase (Q02)",
    "El profesor/a espera silencio (Q03)",
    "El alumnado no trabaja (Q04)",
    "Se distraen con recursos digitales (Q06)",
    "Se distraen por recursos digitales de otros (Q07)"
  )
)

aula_likert <- aula_likert %>%
  left_join(item_labels, by = "item")

write_csv(aula_likert, "aula_likert.csv")


datos_base <- datos_estudiantes %>%
  filter(desfavorecido == TRUE, !is.na(REGION))

res_region <- datos_base %>%
  group_by(REGION) %>%
  summarise(
    n_desfav   = n(),
    n_resil    = sum(resilente == 1, na.rm = TRUE),
    pct_res    = mean(resilente == 1, na.rm = TRUE) * 100,
    mean_score = mean(score_mrs, na.rm = TRUE),
    .groups    = "drop"
  )

gasto_ccaa <- read_csv("gastos_ed.csv") %>%
  mutate(
    REGION   = as.integer(REGION),   # por si entra como carácter
    gasto_pc = gasto_pc_eur         
  ) %>%
  rename(
    ccaa = ccaa_es
  )

res_region_gasto <- res_region %>%
  left_join(gasto_ccaa, by = "REGION")

dplyr::anti_join(res_region, gasto_ccaa, by = "REGION")
dplyr::anti_join(gasto_ccaa, res_region, by = "REGION")

res_region_gasto_out <- res_region_gasto %>%
  select(
    REGION,
    ccaa,          # nombre en castellano
    n_desfav,
    n_resil,
    pct_res,
    mean_score,
    gasto_pc,
    partido
  )

write_csv(res_region_gasto_out, "res_region_gasto.csv")

# Base: solo alumnado desfavorecido
datos_base <- datos_estudiantes %>%
  filter(desfavorecido == TRUE)

# Resumen tipo boxplot para BELONG y FAMSUP
apoyo_box <- datos_base %>%
  select(resilente_fac, BELONG, FAMSUP) %>%
  pivot_longer(
    cols = c(BELONG, FAMSUP),
    names_to = "indice",
    values_to = "valor"
  ) %>%
  filter(!is.na(valor), !is.na(resilente_fac)) %>%
  group_by(indice, resilente_fac) %>%
  summarise(
    n      = n(),
    min    = min(valor, na.rm = TRUE),
    q1     = quantile(valor, 0.25, na.rm = TRUE),
    median = quantile(valor, 0.50, na.rm = TRUE),
    q3     = quantile(valor, 0.75, na.rm = TRUE),
    max    = max(valor, na.rm = TRUE),
    .groups = "drop"
  )

# Etiquetas más legibles
apoyo_labels <- tibble::tibble(
  indice = c("BELONG", "FAMSUP"),
  indice_label = c(
    "Sentido de pertenencia al centro (BELONG)",
    "Soporte familiar percibido (FAMSUP)"
  )
)

apoyo_box <- apoyo_box %>%
  left_join(apoyo_labels, by = "indice")

write_csv(apoyo_box, "apoyo_box.csv")
