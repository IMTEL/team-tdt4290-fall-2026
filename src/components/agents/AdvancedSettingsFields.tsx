import { useId, useState } from 'react';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormHelperText from '@mui/material/FormHelperText';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Slider from '@mui/material/Slider';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import {
  type AdvancedSettings,
  type AdvancedSettingsErrors,
  DEFAULT_ADVANCED_SETTINGS,
  formatTemperature,
  MAX_PROMPT_LENGTH,
  MAX_TEMPERATURE,
  MIN_TEMPERATURE,
} from '@/domain/advancedSettings';
import styles from './AdvancedSettingsFields.module.css';
import type { LanguageModels } from './useLanguageModels';

type AdvancedSettingsFieldsProps = {
  value: AdvancedSettings;
  onChange: (settings: AdvancedSettings) => void;
  /** The prompt built from the answers, shown when the counsellor does not write one by hand. */
  builtPrompt: string;
  languageModels: LanguageModels;
  errors: AdvancedSettingsErrors;
  disabled?: boolean;
};

/**
 * "Advanced settings" for experienced counsellors: the language model, the temperature and a
 * system prompt written by hand. Closed until opened, so other counsellors are not bothered.
 */
export function AdvancedSettingsFields({
  value,
  onChange,
  builtPrompt,
  languageModels,
  errors,
  disabled = false,
}: AdvancedSettingsFieldsProps) {
  const modelLabelId = useId();
  // The text in the number field, kept apart so "0," can be typed on the way to "0,5".
  const [temperatureText, setTemperatureText] = useState(formatTemperature(value.temperature));
  // The last hand-written prompt, so turning the switch off and on again does not lose it.
  const [lastCustomPrompt, setLastCustomPrompt] = useState(value.customPrompt);
  const writesPrompt = value.customPrompt !== null;
  const hasErrors = Object.keys(errors).length > 0;

  function setTemperature(temperature: number) {
    setTemperatureText(formatTemperature(temperature));
    onChange({ ...value, temperature });
  }

  function handleTemperatureText(text: string) {
    setTemperatureText(text);
    // Norwegian keyboards write decimals with a comma.
    const parsed = text.trim() === '' ? Number.NaN : Number(text.replace(',', '.'));
    onChange({ ...value, temperature: parsed });
  }

  function setWritesPrompt(writes: boolean) {
    if (!writes) setLastCustomPrompt(value.customPrompt);
    onChange({ ...value, customPrompt: writes ? (lastCustomPrompt ?? builtPrompt) : null });
  }

  function reset() {
    setTemperatureText(formatTemperature(DEFAULT_ADVANCED_SETTINGS.temperature));
    setLastCustomPrompt(null);
    onChange(DEFAULT_ADVANCED_SETTINGS);
  }

  return (
    <Accordion disableGutters variant="outlined">
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <div className={styles.summary}>
          {/* English translation: Advanced settings */}
          <Typography component="span">Avanserte innstillinger</Typography>
          <Typography variant="body2" color={hasErrors ? 'error' : 'text.secondary'}>
            {hasErrors
              ? // English translation: Something in the settings needs fixing
                'Noe i innstillingene må rettes'
              : summaryText(value)}
          </Typography>
        </div>
      </AccordionSummary>

      <AccordionDetails className={styles.fields}>
        <Typography variant="body2" color="text.secondary">
          {/* English translation: For experienced users. The defaults work well for most interviews. */}
          For erfarne brukere. Standardverdiene fungerer godt for de fleste intervjuer.
        </Typography>

        <FormControl fullWidth disabled={disabled} error={Boolean(errors.model)}>
          {/* English translation: Language model */}
          <InputLabel id={modelLabelId}>Språkmodell</InputLabel>
          <Select
            labelId={modelLabelId}
            label="Språkmodell"
            value={value.model}
            onChange={(event) => onChange({ ...value, model: event.target.value })}
          >
            {languageModels.models.map((model) => (
              <MenuItem key={model} value={model}>
                {model}
              </MenuItem>
            ))}
          </Select>
          <FormHelperText>
            {errors.model ??
              (languageModels.failed
                ? // English translation: Could not load the list of models. You can still keep the current model.
                  'Fikk ikke hentet listen over modeller. Du kan fortsatt beholde modellen du har.'
                : // English translation: The models come from IDUN, NTNU's own servers.
                  'Modellene kommer fra IDUN, NTNUs egne servere.')}
          </FormHelperText>
        </FormControl>

        <div>
          <Typography id={`${modelLabelId}-temperature`} gutterBottom>
            {/* English translation: Temperature */}
            Temperatur
          </Typography>
          <div className={styles.temperature}>
            <Slider
              aria-labelledby={`${modelLabelId}-temperature`}
              value={sliderValue(value.temperature)}
              min={MIN_TEMPERATURE}
              max={MAX_TEMPERATURE}
              step={SLIDER_STEP}
              marks={[
                { value: MIN_TEMPERATURE, label: MIN_TEMPERATURE },
                { value: MAX_TEMPERATURE, label: MAX_TEMPERATURE },
              ]}
              valueLabelDisplay="auto"
              disabled={disabled}
              onChange={(_, temperature) => setTemperature(temperature as number)}
            />
            <TextField
              // English translation: Value
              label="Verdi"
              value={temperatureText}
              onChange={(event) => handleTemperatureText(event.target.value)}
              size="small"
              disabled={disabled}
              error={Boolean(errors.temperature)}
              slotProps={{ htmlInput: { inputMode: 'decimal' } }}
            />
          </div>
          <FormHelperText error={Boolean(errors.temperature)}>
            {errors.temperature ??
              // English translation: Low gives more predictable answers, high gives more varied ones.
              'Lav gir mer forutsigbare svar, høy gir mer varierte svar.'}
          </FormHelperText>
        </div>

        <div>
          <FormControlLabel
            control={
              <Switch
                checked={writesPrompt}
                disabled={disabled}
                onChange={(event) => setWritesPrompt(event.target.checked)}
              />
            }
            // English translation: Write the system prompt myself
            label="Skriv systemprompten selv"
          />
          {writesPrompt ? (
            <TextField
              // English translation: System prompt
              label="Systemprompt"
              value={value.customPrompt ?? ''}
              onChange={(event) => onChange({ ...value, customPrompt: event.target.value })}
              multiline
              minRows={8}
              maxRows={20}
              fullWidth
              disabled={disabled}
              error={Boolean(errors.customPrompt)}
              helperText={
                errors.customPrompt ??
                // English translation: The answers no longer change the prompt. Check that it still
                // tells the agent not to ask for personal data.
                `Svarene endrer ikke lenger prompten. Pass på at den fortsatt ber agenten ikke spørre om personopplysninger. ${(value.customPrompt ?? '').length}/${MAX_PROMPT_LENGTH} tegn`
              }
              className={styles.promptField}
            />
          ) : builtPrompt ? (
            <>
              <FormHelperText>
                {/* English translation: The prompt is made from the answers. This is how it looks now: */}
                Prompten lages fra svarene. Slik ser den ut nå:
              </FormHelperText>
              <pre className={styles.prompt}>{builtPrompt}</pre>
            </>
          ) : (
            <FormHelperText>
              {/* English translation: The prompt is made from the answers. */}
              Prompten lages fra svarene.
            </FormHelperText>
          )}
        </div>

        <div className={styles.actions}>
          <Button onClick={reset} disabled={disabled}>
            {/* English translation: Reset to defaults */}
            Tilbakestill til standard
          </Button>
        </div>
      </AccordionDetails>
    </Accordion>
  );
}

const SLIDER_STEP = 0.1;

/**
 * The slider's position: the temperature rounded to the slider's step and kept between the limits.
 * The exact value lives in the number field. A value off the step (0.333, saved by another client)
 * or out of range would make the slider's hidden range input invalid and block the form's submit.
 */
function sliderValue(temperature: number): number {
  if (!Number.isFinite(temperature)) return MIN_TEMPERATURE;
  const rounded = Math.round(temperature / SLIDER_STEP) * SLIDER_STEP;
  return Math.min(MAX_TEMPERATURE, Math.max(MIN_TEMPERATURE, Number(rounded.toFixed(1))));
}

/** One line under the heading, so the settings can be checked without opening the section. */
function summaryText(settings: AdvancedSettings): string {
  // English translation: <model> · temperature <t> · own system prompt / prompt from the answers
  const prompt = settings.customPrompt !== null ? 'egen systemprompt' : 'prompt fra svarene';
  return `${settings.model} · temperatur ${formatTemperature(settings.temperature)} · ${prompt}`;
}
