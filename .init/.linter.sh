#!/bin/bash
cd /home/kavia/workspace/code-generation/test-case-generator-9744/test_case_generation_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

