import Ajv from 'ajv';
import schema from '../public/spec/action_envelope.schema.json';

const ajv = new Ajv({ allErrors: true });
const validate = ajv.compile(schema);

export interface ValidationResult {
    valid: boolean;
    errors: string[];
}

export function validateEnvelope(data: any): ValidationResult {
    const valid = validate(data);
    if (valid) return { valid: true, errors: [] };

    return {
        valid: false,
        errors: validate.errors?.map(err => `${err.instancePath} ${err.message}`) || ['Unknown validation error']
    };
}

export const FrozenSchema = schema;
