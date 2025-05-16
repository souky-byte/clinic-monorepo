<template>
  <div class="min-h-screen flex flex-col justify-center items-center bg-gray-100 p-4">
    <div class="mb-8 text-center">
      <h1 class="text-2xl font-bold text-gray-900">
        <span class="text-primary-600">HealthCare</span>System
      </h1>
      <p class="text-gray-600 mt-1">Systém pro správu zdravotnické praxe</p>
    </div>
    
    <div class="w-full max-w-md">
      <slot />
    </div>
  </div>
</template>