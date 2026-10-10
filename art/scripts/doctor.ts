import { requireBlender, runBlender } from './blender.ts';

await runBlender(requireBlender(), ['--python', 'art/blender/doctor.py']);
