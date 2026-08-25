import VenueProfileClient from './VenueProfileClient';

type ProfilePageProps={searchParams:Promise<{venue?:string|string[]}>};

export default async function VenueProfilePage({searchParams}:ProfilePageProps){
 const params=await searchParams;
 const venueId=typeof params.venue==='string'?params.venue:'';
 return <VenueProfileClient venueId={venueId}/>;
}
