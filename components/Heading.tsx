// *********************
// Role of the component: Simple H2 heading component
// Name of the component: Heading.tsx
// Developer: perumal ponnusamy
// Version: 1.0
// Component call: <Heading title={title} />
// Input parameters: { title: string }
// Output: h2 heading title with some styles 
// *********************

import React from 'react'

const Heading = ({ title } : { title: string }) => {
  return (
    <h2 className="text-blue-500 text-3xl font-semibold text-center mt-10 max-lg:text-2xl">{ title }</h2>
  )
}

export default Heading